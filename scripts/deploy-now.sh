#!/usr/bin/env bash
# Timeo deploy script — commits current changes and triggers Dokploy redeploy
set -e

REPO_DIR="/Users/jabez/Timeo"
TOKEN="timeotuuFsRtSNIwropxLifsnbInlGQVvUuwEaixjyYfmYIYkNiSZNNUXURqntHeZGbwc"
WEB_APP_ID="KH114M6kwj02WRunDey1x"
API_APP_ID="JumiDwQeQKTMZOM02qDG7"

MSG="${1:-chore: agent updates}"

cd "$REPO_DIR"

echo "📦 Committing changes..."
git add -A
git commit -m "$MSG" || echo "Nothing to commit"

echo "🚀 Pushing to GitHub..."
git push origin main

echo "🔄 Triggering Dokploy Web redeploy..."
curl -s -X POST "https://admin.timeo.my/api/trpc/application.deploy" \
  -H "x-api-key: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"applicationId\":\"$WEB_APP_ID\"}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('Web deploy:', d)"

echo "🔄 Triggering Dokploy API redeploy..."
curl -s -X POST "https://admin.timeo.my/api/trpc/application.deploy" \
  -H "x-api-key: $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"applicationId\":\"$API_APP_ID\"}}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('API deploy:', d)"

echo "✅ Done! Monitoring at https://admin.timeo.my"
