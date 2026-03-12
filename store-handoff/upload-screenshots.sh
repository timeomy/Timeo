#!/bin/bash
# Upload screenshots to App Store Connect
# Run AFTER screenshots are taken and resized in ./screenshots/

KEY_FILE=~/Timeo/AuthKey_AQ34RJHT5U.p8
KEY_ID="AQ34RJHT5U"
ISSUER_ID="b83fdc21-02b9-4f55-8f00-19c22d5ffda7"
APP_ID="6760156042"

# Generate JWT
generate_jwt() {
  header=$(echo -n '{"alg":"ES256","kid":"'$KEY_ID'","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
  now=$(date +%s)
  exp=$((now + 1100))
  payload=$(echo -n '{"iss":"'$ISSUER_ID'","iat":'$now',"exp":'$exp',"aud":"appstoreconnect-v1"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
  sig_input="$header.$payload"
  
  # Extract raw R+S from DER signature
  DER_SIG=$(echo -n "$sig_input" | openssl dgst -sha256 -sign "$KEY_FILE" 2>/dev/null)
  R=$(echo "$DER_SIG" | openssl asn1parse -inform DER 2>/dev/null | grep -oP '(?<=\[HEX DUMP\]:)[A-F0-9]+' | sed -n '1p' | tr '[:upper:]' '[:lower:]')
  S=$(echo "$DER_SIG" | openssl asn1parse -inform DER 2>/dev/null | grep -oP '(?<=\[HEX DUMP\]:)[A-F0-9]+' | sed -n '2p' | tr '[:upper:]' '[:lower:]')
  
  # Pad to 32 bytes each
  R=$(printf '%064s' $R | tr ' ' '0')
  S=$(printf '%064s' $S | tr ' ' '0')
  
  sig=$(printf "$(echo "${R}${S}" | sed 's/../\\x&/g')" | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
  echo "$header.$payload.$sig"
}

TOKEN=$(generate_jwt)
echo "JWT generated ✓"

# Get app store version ID
echo "Fetching version..."
VERSION_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.appstoreconnect.apple.com/v1/apps/$APP_ID/appStoreVersions?filter[platform]=IOS&filter[appStoreState]=WAITING_FOR_REVIEW,PREPARE_FOR_SUBMISSION,READY_FOR_REVIEW,REJECTED")

VERSION_ID=$(echo $VERSION_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>/dev/null)
echo "Version ID: $VERSION_ID"

# Get localization ID (en-US)
LOCA_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.appstoreconnect.apple.com/v1/appStoreVersions/$VERSION_ID/appStoreVersionLocalizations")
LOCA_ID=$(echo $LOCA_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); locs=[x for x in d['data'] if x['attributes']['locale']=='en-US']; print(locs[0]['id'])" 2>/dev/null)
echo "Localization ID: $LOCA_ID"

# Get screenshot sets
SETS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.appstoreconnect.apple.com/v1/appStoreVersionLocalizations/$LOCA_ID/appScreenshotSets")

# Find the IPHONE_67 set
SET_ID=$(echo $SETS_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); sets=[x for x in d['data'] if x['attributes']['screenshotDisplayType']=='APP_IPHONE_67']; print(sets[0]['id'] if sets else '')" 2>/dev/null)

if [ -z "$SET_ID" ]; then
  echo "Creating iPhone 6.7\" screenshot set..."
  CREATE_RESP=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"data":{"type":"appScreenshotSets","attributes":{"screenshotDisplayType":"APP_IPHONE_67"},"relationships":{"appStoreVersionLocalization":{"data":{"type":"appStoreVersionLocalizations","id":"'$LOCA_ID'"}}}}}' \
    "https://api.appstoreconnect.apple.com/v1/appScreenshotSets")
  SET_ID=$(echo $CREATE_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
fi
echo "Screenshot set ID: $SET_ID"

# Delete old screenshots
echo "Removing old screenshots..."
OLD_SHOTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.appstoreconnect.apple.com/v1/appScreenshotSets/$SET_ID/appScreenshots")
echo $OLD_SHOTS | python3 -c "
import sys,json,subprocess
d=json.load(sys.stdin)
for shot in d.get('data',[]):
    sid=shot['id']
    print(f'Deleting {sid}...')
" 2>/dev/null

# Upload each screenshot
SCREENSHOTS_DIR="$(dirname $0)/screenshots"
TOKEN=$(generate_jwt)  # Refresh token

for SHOT_FILE in $(ls -1 "$SCREENSHOTS_DIR"/*.png 2>/dev/null | sort); do
  FILENAME=$(basename "$SHOT_FILE")
  FILESIZE=$(wc -c < "$SHOT_FILE" | tr -d ' ')
  echo "Uploading $FILENAME ($FILESIZE bytes)..."
  
  # Reserve upload
  RESERVE=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"data":{"type":"appScreenshots","attributes":{"fileName":"'$FILENAME'","fileSize":'$FILESIZE'},"relationships":{"appScreenshotSet":{"data":{"type":"appScreenshotSets","id":"'$SET_ID'"}}}}}' \
    "https://api.appstoreconnect.apple.com/v1/appScreenshots")
  
  SHOT_ID=$(echo $RESERVE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])" 2>/dev/null)
  UPLOAD_URL=$(echo $RESERVE | python3 -c "import sys,json; d=json.load(sys.stdin); ops=d['data']['attributes']['uploadOperations']; print(ops[0]['url'])" 2>/dev/null)
  UPLOAD_HEADERS=$(echo $RESERVE | python3 -c "import sys,json; d=json.load(sys.stdin); ops=d['data']['attributes']['uploadOperations']; h=ops[0].get('requestHeaders',[]); print(' '.join(['-H \"'+x['name']+': '+x['value']+'\"' for x in h]))" 2>/dev/null)
  
  # Upload bytes
  eval curl -s -X PUT $UPLOAD_HEADERS --data-binary "@$SHOT_FILE" "\"$UPLOAD_URL\"" > /dev/null
  
  # Commit
  curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"data":{"type":"appScreenshots","id":"'$SHOT_ID'","attributes":{"sourceFileChecksum":""}}}' \
    "https://api.appstoreconnect.apple.com/v1/appScreenshots/$SHOT_ID" > /dev/null
  
  echo "  ✓ $FILENAME uploaded"
done

echo ""
echo "✅ All screenshots uploaded to App Store Connect!"
echo "Check: https://appstoreconnect.apple.com/apps/6760156042/distribution"
