# Timeo — Setup Status & What You Need To Do

> Generated: 2026-03-05
> All code is complete, typechecked, and ready. This document tells you exactly what steps YOU need to take to make Timeo live.

---

## ✅ What's Already Done (Code Is Ready)

| Area | Status | Details |
|------|--------|---------|
| TypeScript | ✅ 0 errors | All 18 packages pass `tsc --noEmit` |
| API (Hono) | ✅ Complete | 22 route modules + platform C2 routes |
| Database | ✅ Complete | 14 schema files, 4 migrations, RLS policies |
| Web (Next.js) | ✅ Complete | 22+ pages, auth, dashboard, C2 admin |
| C2 Control Center | ✅ Complete | All 12 modules at `/admin/*` |
| Docker files | ✅ Complete | Dev + production compose files |
| Dockerfiles | ✅ Complete | Multi-stage builds for API and Web |
| CI/CD | ✅ Complete | 8 GitHub Actions workflows |
| Email integration | ✅ Complete | Nodemailer + Brevo SMTP configured |
| Payment webhooks | ✅ Complete | Stripe + Revenue Monster handlers |
| Health endpoint | ✅ Updated | `/health` now checks DB + Redis status |
| `.env` file | ✅ Ready | Local dev secrets generated |

---

## 🔴 What YOU Must Do (In Order)

### Step 1 — Local Dev Setup (Your Mac)

Open Terminal in your Timeo folder:

```bash
# 1. Install pnpm (if not already installed)
npm install -g pnpm@9

# 2. Install all dependencies
pnpm install

# 3. Start Docker (PostgreSQL + Redis)
docker compose up -d postgres redis

# Wait 10 seconds, then run migrations
pnpm --filter @timeo/db exec drizzle-kit migrate

# 4. Start the API (Terminal 1)
pnpm --filter @timeo/api dev
# Wait for: "Server running on http://localhost:4000"

# 5. Start the Web (Terminal 2)
pnpm --filter @timeo/web dev
# Wait for: "Ready on http://localhost:3000"

# 6. Verify everything works
curl http://localhost:4000/health
# Expected: {"success":true,"data":{"status":"ok","database":"connected","redis":"connected"}}
```

Then open http://localhost:3000 in your browser.

### Step 2 — Create Your Admin Account (Browser)

1. Go to http://localhost:3000/sign-up
2. Sign up with your email
3. Check Terminal 1 (API server) for the verification URL — it prints there since SMTP is not configured yet
4. Paste the URL in your browser to verify

### Step 3 — Promote Yourself to Platform Admin

```bash
# Replace YOUR_EMAIL with the email you signed up with
docker exec -it timeo-postgres psql -U timeo -d timeo -c "
  UPDATE tenant_members
  SET role = 'platform_admin'
  WHERE user_id = (SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com');
"
```

Then go to http://localhost:3000/admin — you now have access to all 12 C2 modules!

### Step 4 — Seed Feature Flags (Browser)

1. Go to http://localhost:3000/admin/data
2. Click **"Seed Feature Flags"**

This creates 10 default flags controlling POS, appointments, loyalty, inventory, etc.

---

## 🟡 Production Setup (When Ready to Go Live)

### VPS Setup
1. **Buy a VPS** — Hetzner CX22 (~RM20/mo) or DigitalOcean (~RM50/mo)
   - OS: Ubuntu 22.04 or 24.04
   - Region: Singapore (closest to Malaysia)
2. **SSH in** and install Docker: `curl -fsSL https://get.docker.com | sh`
3. **Install Dokploy**: `curl -sSL https://dokploy.com/install.sh | sh`
4. **Point DNS** (at your domain registrar):
   - `timeo.my` → `YOUR_VPS_IP`
   - `api.timeo.my` → `YOUR_VPS_IP`
   - `www.timeo.my` → `YOUR_VPS_IP`

### Deploy to VPS

```bash
# On VPS:
mkdir -p /opt/timeo && cd /opt/timeo
git clone https://github.com/timeomy/Timeo.git .

# Generate production secrets (run on your Mac first):
./scripts/generate-secrets.sh

# Create production .env (nano .env) with:
# - BETTER_AUTH_SECRET=<generated>
# - JWT_SECRET=<generated>
# - POSTGRES_PASSWORD=<generated>
# - REDIS_PASSWORD=<generated>
# - SITE_URL=https://timeo.my
# - API_URL=https://api.timeo.my
# - NODE_ENV=production

# Create volumes
docker volume create pgdata && docker volume create redisdata

# Start services
docker compose -f docker-compose.prod.yml up -d postgres redis
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d api web
```

### Email (Brevo SMTP)
1. Sign up at https://app.brevo.com (free — 300 emails/day)
2. Add domain `timeo.my` → Settings → Domains → Authenticate
3. Get SMTP key → Settings → SMTP & API → SMTP Keys → Generate
4. Add to `.env`:
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-brevo-login@example.com
   SMTP_PASS=xsmtpsib-...
   EMAIL_FROM=noreply@timeo.my
   ```

### Payment Gateway (Revenue Monster)
1. Sign up at https://merchant.revenuemonster.my
2. Complete merchant verification
3. Create application → get Client ID + Client Secret + Private Key
4. Add to `.env`:
   ```
   REVENUE_MONSTER_CLIENT_ID=your-client-id
   REVENUE_MONSTER_CLIENT_SECRET=your-client-secret
   REVENUE_MONSTER_ENVIRONMENT=sandbox  # change to production when ready
   ```

---

## Quick Command Reference

### Local Dev (Your Mac)
```bash
pnpm --filter @timeo/api dev          # Start API (port 4000)
pnpm --filter @timeo/web dev          # Start web (port 3000)
pnpm typecheck                        # Type check all packages
docker compose up -d postgres redis   # Start DB containers
docker compose down                   # Stop DB containers
```

### Production (VPS via SSH)
```bash
cd /opt/timeo
docker compose -f docker-compose.prod.yml ps                          # Status
docker compose -f docker-compose.prod.yml logs api                   # API logs
docker compose -f docker-compose.prod.yml up -d --build api          # Rebuild API
git pull && docker compose -f docker-compose.prod.yml up -d --build  # Full redeploy
```

### URLs
| Environment | Web | API | Admin |
|-------------|-----|-----|-------|
| Local | http://localhost:3000 | http://localhost:4000 | http://localhost:3000/admin |
| Production | https://timeo.my | https://api.timeo.my | https://timeo.my/admin |

---

## Mobile Apps (After Backend is Live)

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login` (account: oxloz)
3. Build: `cd apps/admin && eas build --platform android --profile production`
4. Submit: `eas submit --platform android --profile production`
5. Repeat for `apps/staff`, `apps/customer`, `apps/platform`

Need: Google Play Console ($25 one-time) + Apple Developer ($99/year)

---

## GitHub CI/CD (Automatic Deploys)

Add these secrets at https://github.com/timeomy/Timeo/settings/secrets/actions:

| Secret | Where to Get |
|--------|-------------|
| `DOKPLOY_TOKEN` | Dokploy dashboard → Settings → API → Generate Token |
| `DOKPLOY_WEBHOOK_URL` | Dokploy → API service → Settings → Webhook URL |
| `DOKPLOY_WEB_WEBHOOK_URL` | Dokploy → Web service → Settings → Webhook URL |
| `EXPO_TOKEN` | https://expo.dev → Account Settings → Access Tokens |

After setting these, every push to `main` auto-deploys the API and Web.
