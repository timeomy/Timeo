# Timeo — App Store Handoff Package
*For Claude Code or manual completion*

---

## 📁 Folder Contents

```
store-handoff/
├── README.md                    ← You are here
├── upload-screenshots.sh        ← Automated screenshot uploader
├── logo/
│   ├── timeo-icon-master.svg    ← MASTER BRAND ICON (dark bg + "timeo" + blue dot)
│   ├── timeo-icon-web.svg       ← Web app icon (from timeo.my)
│   ├── timeo-favicon-website.svg← Website favicon
│   ├── timeo-icon-512.png       ← Current Flutter 512px icon
│   └── timeo-icon-current.png   ← Current Flutter icon
├── app-icon/                    ← Current iOS AppIcon.appiconset (all sizes)
└── screenshots/                 ← PUT SIMULATOR SCREENSHOTS HERE
```

---

## 🎨 Brand Identity (Web App)
The Timeo logo is:
- **Text:** `timeo` — white, font-weight 800, letter-spacing tight
- **Accent:** Blue dot `#0066FF` — positioned top-right of the text
- **Background:** Dark `#0A0F1E`
- **Font:** SF Pro / Inter / system sans-serif

The master SVG is at `logo/timeo-icon-master.svg` — convert to PNG for app icon.

---

## Task 1 — Fix App Icon

The Flutter app icon needs to match the web app branding.

### Convert master SVG → all iOS sizes:
```bash
# Install rsvg-convert if needed: brew install librsvg
rsvg-convert -w 1024 -h 1024 ~/Timeo/store-handoff/logo/timeo-icon-master.svg \
  -o ~/Timeo/store-handoff/logo/timeo-icon-1024.png

# Generate all required iOS sizes
ICON=~/Timeo/store-handoff/logo/timeo-icon-1024.png
DEST=~/Timeo/apps/timeo_flutter/ios/Runner/Assets.xcassets/AppIcon.appiconset

sips -z 20 20     "$ICON" --out "$DEST/Icon-App-20x20@1x.png"
sips -z 40 40     "$ICON" --out "$DEST/Icon-App-20x20@2x.png"
sips -z 60 60     "$ICON" --out "$DEST/Icon-App-20x20@3x.png"
sips -z 29 29     "$ICON" --out "$DEST/Icon-App-29x29@1x.png"
sips -z 58 58     "$ICON" --out "$DEST/Icon-App-29x29@2x.png"
sips -z 87 87     "$ICON" --out "$DEST/Icon-App-29x29@3x.png"
sips -z 40 40     "$ICON" --out "$DEST/Icon-App-40x40@1x.png"
sips -z 80 80     "$ICON" --out "$DEST/Icon-App-40x40@2x.png"
sips -z 120 120   "$ICON" --out "$DEST/Icon-App-40x40@3x.png"
sips -z 120 120   "$ICON" --out "$DEST/Icon-App-60x60@2x.png"
sips -z 180 180   "$ICON" --out "$DEST/Icon-App-60x60@3x.png"
sips -z 76 76     "$ICON" --out "$DEST/Icon-App-76x76@1x.png"
sips -z 152 152   "$ICON" --out "$DEST/Icon-App-76x76@2x.png"
sips -z 167 167   "$ICON" --out "$DEST/Icon-App-83.5x83.5@2x.png"
sips -z 1024 1024 "$ICON" --out "$DEST/Icon-App-1024x1024@1x.png"

echo "All icon sizes generated ✓"
```

### Upload 1024x1024 icon to App Store Connect:
The 1024px icon is used for the App Store listing. Upload it via App Store Connect UI:
→ https://appstoreconnect.apple.com/apps/6760156042/distribution
→ App Information → App Icon → Upload

---

## Task 2 — Take Simulator Screenshots

### Build & launch:
```bash
cd ~/Timeo/apps/timeo_flutter
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 flutter build ios --simulator --debug
xcrun simctl install FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 build/ios/iphonesimulator/Runner.app
xcrun simctl launch FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 my.timeo.timeoFlutter
```

### Demo login: `ws.member@timeo.my` / `123456`

### Take screenshots (after navigating to each screen):
```bash
SHOTS=~/Timeo/store-handoff/screenshots
xcrun simctl io FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 screenshot $SHOTS/01-signin.png
# Log in, then:
xcrun simctl io FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 screenshot $SHOTS/02-home.png
# Tap QR tab:
xcrun simctl io FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 screenshot $SHOTS/03-qr.png
# Tap Membership tab:
xcrun simctl io FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 screenshot $SHOTS/04-membership.png
# Tap Profile tab:
xcrun simctl io FB4FC7A4-6BC0-4474-BCBC-140E89BBE4C3 screenshot $SHOTS/05-profile.png
```

### Resize to App Store dimensions (1290x2796 for iPhone 6.7"):
```bash
for f in ~/Timeo/store-handoff/screenshots/*.png; do
  sips -z 2796 1290 "$f" --out "$f"
done
echo "Resized ✓"
```

---

## Task 3 — Upload Screenshots to App Store Connect

```bash
cd ~/Timeo/store-handoff && bash upload-screenshots.sh
```

This script:
- Generates JWT from ~/Timeo/AuthKey_AQ34RJHT5U.p8
- Finds the current version (Waiting for Review)
- Removes old Expo screenshots
- Uploads all PNGs from the screenshots/ folder

---

## App Store Connect Credentials
- App ID: `6760156042`
- API Key: `~/Timeo/AuthKey_AQ34RJHT5U.p8`
- Key ID: `AQ34RJHT5U`
- Issuer ID: `b83fdc21-02b9-4f55-8f00-19c22d5ffda7`
- App URL: https://appstoreconnect.apple.com/apps/6760156042/distribution

---

## Android — Separate issue (key reset needed)
The Android AAB is built and ready at:
`~/Timeo/apps/timeo_flutter/build/app/outputs/bundle/release/app-release.aab`

But Google Play needs an upload key reset first:
1. Go to: https://play.google.com/console/u/0/developers/9028780452151240538/app/4975353409846486174/setup/app-signing
2. Click "Request upload key reset"
3. Follow the prompts
4. Google processes in ~48 hrs, then re-upload the AAB

---

## Status
- ✅ iOS: Submitted — Waiting for Review
- ✅ Screenshots: Need replacement (old Expo mockups showing)
- ✅ App icon: Needs update to match web branding
- 🔄 Android: AAB ready, key reset pending Jabez action
