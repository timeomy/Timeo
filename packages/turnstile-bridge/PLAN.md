# Turnstile Bridge Service

Lightweight Node.js service that runs on the Gym PC (LAN) and keeps the turnstile face database in sync with Timeo.

## Architecture

```
Timeo API (cloud) ──webhook──> Turnstile Bridge (Gym PC) ──WS──> Turnstile (192.168.1.201:8000)
```

## Events to Handle

| Timeo Event | Bridge Action |
|---|---|
| Member face photo uploaded | Enroll face on turnstile |
| Member face photo updated | Update face on turnstile (delete old + enroll new) |
| Membership expired | Delete face from turnstile |
| Membership renewed/activated | Re-enroll face on turnstile |
| Member suspended/deleted by admin | Delete face from turnstile |
| Member status changed to active | Enroll face if photo exists |

## Turnstile WebSocket Protocol (ZAH/FaceDemo)

- Auth: HTTP POST to http://IP:8000 with Basic auth header
- WS: Connect to ws://IP:8000?Basic=<base64(user:pass)>
- Upload: `{cmd:"upload person", id, name, role:0, reg_image:<base64>, ...}`
- Delete: `{cmd:"delete person(s)", flag:-1, id:<person_id>, worksite_id:""}`
- List: `{cmd:"request persons", role:-1, page_no:1, page_size:20, image_flag:0, ...}`

## Bridge Service Design

### Webhook Receiver
- Express server on port 3456
- POST /webhook/face-sync — receives events from Timeo API
- Signed with a shared secret (HMAC)

### Turnstile Client  
- Maintains persistent WebSocket connection to turnstile
- Auto-reconnects on disconnect
- Queue system for commands (one at a time, wait for response)

### Sync Modes
1. **Event-driven** — webhooks from Timeo for real-time sync
2. **Periodic full sync** — every 6 hours, compare Timeo DB with turnstile DB, fix drift
3. **Manual sync** — API endpoint to trigger full sync

### API Endpoints (Bridge)
- POST /webhook/face-sync — receive Timeo events
- POST /sync/full — trigger full sync
- GET /status — bridge health + turnstile connection status
- GET /faces — list faces on turnstile

## Timeo API Changes

### New Webhook System
Add to gate.routes.ts or a new turnstile.routes.ts:
- When face photo is uploaded/updated → fire webhook
- When membership status changes → fire webhook  
- When subscription expires/renews → fire webhook

### Webhook Payload
```json
{
  "event": "face.enrolled|face.removed|membership.expired|membership.renewed",
  "tenantId": "...",
  "userId": "...",  
  "memberId": "...",
  "memberName": "...",
  "faceImageUrl": "...",
  "timestamp": "..."
}
```

### Cron: Membership Expiry Check
- Run hourly
- Find memberships that expired since last check
- Fire webhook for each expired member
- Also find memberships renewed since last check

## Config
```env
TURNSTILE_IP=192.168.1.201
TURNSTILE_PORT=8000
TURNSTILE_USER=admin
TURNSTILE_PASS=admin
TIMEO_API_URL=https://api.timeo.my
WEBHOOK_SECRET=<shared-secret>
SYNC_INTERVAL_HOURS=6
PORT=3456
```

## File Structure
```
packages/turnstile-bridge/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          — entry point, Express server
│   ├── turnstile.ts      — WS client for turnstile
│   ├── webhook.ts        — webhook handler routes
│   ├── sync.ts           — full sync logic
│   ├── config.ts         — env config
│   └── logger.ts         — simple logger
└── PLAN.md
```
