# Turnstile WebSocket Bridge

Cloudflare Worker with Durable Objects to handle WebSocket connections from turnstile devices.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/turnstile/socket` | WebSocket | Device connection endpoint |
| `/turnstile/cmd` | POST | Send commands to connected devices |
| `/turnstile/health` | GET | Health check |
| `/turnstile/devices` | GET | List connected devices (placeholder) |

## Setup

1. **Install dependencies:**
   ```bash
   cd cloudflare-worker
   npm install
   ```

2. **Configure secrets:**
   ```bash
   wrangler secret put SUPABASE_ANON_KEY
   wrangler secret put TURNSTILE_SHARED_SECRET
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## Usage

### Device Connection

The device connects via WebSocket:
```
ws://gate.wsfitness.my/turnstile/socket?device_id=DEVICE_SN
```

### Sending Commands

POST to `/turnstile/cmd`:
```bash
curl -X POST https://gate.wsfitness.my/turnstile/cmd \
  -H "Content-Type: application/json" \
  -H "x-turnstile-secret: YOUR_SECRET" \
  -d '{
    "device_id": "DEVICE_SN",
    "command": {
      "cmd": "upload_person",
      "person": {
        "id": "12345",
        "name": "John Doe",
        "image": "base64..."
      }
    }
  }'
```

## Flow

```
┌─────────────┐     WebSocket      ┌─────────────────────┐
│   Device    │◄──────────────────►│  Durable Object     │
│  (Turnstile)│                    │  (TurnstileSocket)  │
└─────────────┘                    └──────────┬──────────┘
                                              │
                                              │ Forward
                                              │
┌─────────────┐    POST /cmd       ┌──────────▼──────────┐
│   Web App   │───────────────────►│  Cloudflare Worker  │
│  (Admin)    │                    │  (Entry Point)      │
└─────────────┘                    └─────────────────────┘
```

## Face Recognition Flow

1. Device sends face recognition event via WebSocket
2. Worker calls `check-turnstile-access` Edge Function
3. Edge Function checks membership status
4. Worker sends allow/deny response back to device

## Local Development

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

## Logs

View live logs:
```bash
npm run tail
```
