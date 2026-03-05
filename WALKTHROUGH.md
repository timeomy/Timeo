# WALKTHROUGH.md — Timeo Step-by-Step Setup & Deployment

> Follow these steps in order. Steps marked **DONE** are already configured in the codebase. Steps marked **YOU** require your action.

---

## Status Legend

- **DONE** = Already configured/coded — no action needed
- **YOU** = Requires your manual action (accounts, credentials, commands)

---

## Phase 1: Local Development

### Step 1 — Install CLI Tools **[YOU]**

```bash
npm install -g pnpm@9
npm install -g eas-cli
eas login   # Log in to your Expo account (oxloz)
```

### Step 2 — Clone & Install **[YOU]**

```bash
git clone https://github.com/timeomy/Timeo.git
cd Timeo
pnpm install
```

### Step 3 — Environment File **[YOU]**

```bash
cp .env.example .env
```

Open `.env` and fill in **only these** (the rest have defaults):

```env
BETTER_AUTH_SECRET=<run: openssl rand -base64 32>
JWT_SECRET=<run: openssl rand -base64 32>
```

Everything else is pre-filled for local dev:
- `DATABASE_URL=postgresql://timeo:timeo@localhost:5432/timeo`
- `REDIS_URL=redis://localhost:6379`
- `SITE_URL=http://localhost:3000`
- `API_URL=http://localhost:4000`

### Step 4 — Start PostgreSQL & Redis **[YOU]**

```bash
docker compose up -d postgres redis
docker compose ps   # verify both are "healthy"
```

### Step 5 — Run Database Migrations **[YOU]**

```bash
pnpm --filter @timeo/db exec drizzle-kit migrate
```

### Step 6 — Start Dev Servers **[YOU]**

Open two terminals:

```bash
# Terminal 1 — API (port 4000)
pnpm --filter @timeo/api dev

# Terminal 2 — Web (port 3000)
pnpm --filter @timeo/web dev
```

### Step 7 — Verify **[YOU]**

```bash
curl http://localhost:4000/health
# Should return: {"success":true,"data":{"status":"ok",...}}
```

Then open http://localhost:3000 in your browser.

---

## Phase 2: Access the C2 Command Center

### Step 8 — Create Your Admin Account **[YOU]**

1. Go to http://localhost:3000/sign-up
2. Register with your email
3. If SMTP is not configured, check the API terminal output for the verification link
4. Click the verification link to verify your email

### Step 9 — Promote to Platform Admin **[YOU]**

```bash
docker exec -it timeo-postgres psql -U timeo -d timeo -c "
  UPDATE tenant_memberships
  SET role = 'platform_admin'
  WHERE user_id = (
    SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'
  );
"
```

Replace `YOUR_EMAIL@example.com` with the email you signed up with.

### Step 10 — Access C2 **[YOU]**

Go to http://localhost:3000/admin

You now have access to all 12 C2 modules:

| Module | URL | What You Can Do |
|--------|-----|-----------------|
| Command Dashboard | `/admin` | View KPIs, system health, activity feed |
| Tenant Management | `/admin/tenants` | Create/edit/suspend tenants |
| User Management | `/admin/users` | View all users, force logout |
| Billing & Plans | `/admin/billing` | Manage subscription plans |
| Feature Flags | `/admin/features` | Toggle features per tenant |
| Platform Config | `/admin/config` | Change auth, email, payment settings |
| Analytics | `/admin/analytics` | View growth and revenue charts |
| Activity Log | `/admin/activity` | Audit trail of all actions |
| System Health | `/admin/health` | API, DB, Redis status |
| Communications | `/admin/communications` | Send announcements |
| API & Integrations | `/admin/integrations` | Manage API keys |
| Data Management | `/admin/data` | Seed data, backups |

### Step 11 — Seed Feature Flags **[YOU]**

In the C2 dashboard, go to `/admin/data` and click "Seed Feature Flags". This creates the 10 default flags:

| Flag | Purpose |
|------|---------|
| `pos_enabled` | Point-of-sale system |
| `appointments_enabled` | Booking & scheduling |
| `loyalty_enabled` | Points & rewards |
| `inventory_enabled` | Stock management |
| `offline_sync` | Offline POS sync |
| `custom_domain` | Tenant custom domains |
| `e_invoice` | Malaysia e-Invoice |
| `analytics_advanced` | Advanced reporting |
| `multi_currency` | Multi-currency support |
| `maintenance_mode` | Tenant maintenance mode |

---

## Phase 3: Production Deployment (Dokploy)

### Step 12 — Get a VPS **[YOU]**

Buy a VPS with these minimum specs:

| Resource | Minimum |
|----------|---------|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Storage | 80 GB SSD |
| OS | Ubuntu 22.04+ |

Recommended providers:
- **Hetzner CX22** — EUR 4.49/mo (best value)
- **Contabo VPS S** — EUR 5.99/mo (most RAM)
- **DigitalOcean Basic** — $12/mo

### Step 13 — Point DNS **[YOU]**

In your domain registrar (for `timeo.my`), add these A records:

```
timeo.my       →  YOUR_VPS_IP
www.timeo.my   →  YOUR_VPS_IP
api.timeo.my   →  YOUR_VPS_IP
```

Wait for DNS propagation (5-30 minutes).

### Step 14 — Install Dokploy **[YOU]**

```bash
ssh root@YOUR_VPS_IP
curl -sSL https://dokploy.com/install.sh | sh
```

Then open `https://YOUR_VPS_IP:3000` in your browser and create your Dokploy admin account.

### Step 15 — Generate Production Secrets **[YOU]**

Run locally:

```bash
./scripts/generate-secrets.sh
```

Output:
```
BETTER_AUTH_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTGRES_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REDIS_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Save these somewhere secure.** You will paste them into Dokploy in the next steps.

### Step 16 — Create PostgreSQL in Dokploy **[YOU]**

In Dokploy dashboard → New Service → Database → PostgreSQL 16:

| Field | Value |
|-------|-------|
| Container Name | `timeo-postgres` |
| Database Name | `timeo` |
| Username | `timeo` |
| Password | *(paste POSTGRES_PASSWORD from Step 15)* |
| Volume | `/var/lib/postgresql/data` |
| Network | Internal only |

### Step 17 — Create Redis in Dokploy **[YOU]**

New Service → Database → Redis 7:

| Field | Value |
|-------|-------|
| Container Name | `timeo-redis` |
| Password | *(paste REDIS_PASSWORD from Step 15)* |
| Max Memory | `128mb` |
| Network | Internal only |

### Step 18 — Create API Service in Dokploy **[YOU]**

New Service → Application → Docker:

| Field | Value |
|-------|-------|
| Source | GitHub → `timeomy/Timeo` |
| Dockerfile Path | `infra/api/Dockerfile` |
| Container Name | `timeo-api` |
| Port | `4000` |
| Domain | `api.timeo.my` |
| SSL | Enable (Let's Encrypt) |

Then add these environment variables in Dokploy:

```env
DATABASE_URL=postgresql://timeo:PASTE_POSTGRES_PASSWORD@timeo-postgres:5432/timeo
REDIS_URL=redis://:PASTE_REDIS_PASSWORD@timeo-redis:6379
BETTER_AUTH_SECRET=PASTE_FROM_STEP_15
JWT_SECRET=PASTE_FROM_STEP_15
SITE_URL=https://timeo.my
API_URL=https://api.timeo.my
ALLOWED_ORIGINS=https://timeo.my,https://www.timeo.my
PORT=4000
NODE_ENV=production
EMAIL_FROM=noreply@timeo.my
```

### Step 19 — Create Web Service in Dokploy **[YOU]**

New Service → Application → Docker:

| Field | Value |
|-------|-------|
| Source | GitHub → `timeomy/Timeo` |
| Dockerfile Path | `infra/web/Dockerfile` |
| Container Name | `timeo-web` |
| Port | `3000` |
| Domains | `timeo.my` and `www.timeo.my` |
| SSL | Enable (Let's Encrypt) |

**Build arguments** (these get baked into the JS bundle):

```env
NEXT_PUBLIC_API_URL=https://api.timeo.my
NEXT_PUBLIC_SITE_URL=https://timeo.my
```

**Runtime environment variables:**

```env
BETTER_AUTH_SECRET=PASTE_SAME_AS_API_MUST_MATCH
```

**CRITICAL:** `BETTER_AUTH_SECRET` must be **identical** on both API and Web services. If they don't match, auth will break.

### Step 20 — Deploy & Run Migrations **[YOU]**

1. Click "Deploy" on both API and Web services in Dokploy
2. Wait for builds to complete
3. SSH into VPS and run migrations:

```bash
ssh root@YOUR_VPS_IP
docker exec -it timeo-api sh -c "npx drizzle-kit migrate"
```

### Step 21 — Verify Production **[YOU]**

```bash
# API health
curl https://api.timeo.my/health
# Expected: {"success":true,"data":{"status":"ok",...}}

# Web app
curl -I https://timeo.my
# Expected: HTTP/2 200
```

Then:
1. Go to https://timeo.my/sign-up — create your account
2. Verify email
3. Promote to platform_admin (same SQL as Step 9, but run inside VPS):

```bash
docker exec -it timeo-postgres psql -U timeo -d timeo -c "
  UPDATE tenant_memberships
  SET role = 'platform_admin'
  WHERE user_id = (
    SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'
  );
"
```

4. Go to https://timeo.my/admin — your production C2 is live

---

## Phase 4: CI/CD Auto-Deploy

### Step 22 — Set GitHub Secrets **[YOU]**

Go to https://github.com/timeomy/Timeo/settings/secrets/actions and add:

| Secret | Where to Get It |
|--------|----------------|
| `DOKPLOY_TOKEN` | Dokploy dashboard → Settings → API → Generate Token |
| `DOKPLOY_WEBHOOK_URL` | Dokploy → API service → Settings → Webhook URL |
| `DOKPLOY_WEB_WEBHOOK_URL` | Dokploy → Web service → Settings → Webhook URL |

### What's Already Configured **[DONE]**

These CI/CD workflows are already in `.github/workflows/`:

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `ci.yml` | Pull request to `main` | Runs lint + typecheck + build |
| `deploy-backend.yml` | Push to `main` (API/DB/infra changes) | Triggers Dokploy API rebuild |
| `deploy-web.yml` | Push to `main` (web/UI/shared changes) | Triggers Dokploy web rebuild |
| `typecheck.yml` | Push | Full monorepo typecheck |
| `api-tests.yml` | Push | Vitest API tests |
| `e2e.yml` | Push | Playwright E2E tests |
| `eas-build.yml` | Push | Mobile EAS builds |
| `eas-update.yml` | Push | Mobile OTA updates |

After Step 22, every push to `main` will auto-deploy.

---

## Phase 5: Email Setup

### Step 23 — Set Up Brevo SMTP **[YOU]**

1. Sign up at https://app.brevo.com (free — 300 emails/day)
2. Go to Settings → SMTP & API → SMTP
3. Note your SMTP credentials
4. Add to Dokploy API environment variables:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-login@example.com
SMTP_PASS=your-brevo-smtp-key
EMAIL_FROM=noreply@timeo.my
```

5. Redeploy the API service

### What's Already Configured **[DONE]**

- Nodemailer integration in `packages/api/src/lib/email.ts`
- Better Auth hooks for verification & password reset emails
- Email templates in the C2 dashboard (`/admin/communications`)

---

## Phase 6: Payment Gateway

### Step 24 — Revenue Monster Setup **[YOU]**

1. Sign up at https://merchant.revenuemonster.my
2. Get your API credentials (Client ID, Client Secret)
3. Download your private/public key PEM files
4. Add to Dokploy API environment variables:

```env
REVENUE_MONSTER_CLIENT_ID=your-client-id
REVENUE_MONSTER_CLIENT_SECRET=your-client-secret
REVENUE_MONSTER_PRIVATE_KEY_PATH=/app/keys/rm-private.pem
REVENUE_MONSTER_PUBLIC_KEY_PATH=/app/keys/rm-public.pem
REVENUE_MONSTER_STORE_ID=your-store-id
REVENUE_MONSTER_ENVIRONMENT=production
```

5. In RM Dashboard → Webhooks → Add: `https://api.timeo.my/webhooks/revenue-monster`
6. Redeploy the API service

### Step 25 — Stripe Setup (Optional) **[YOU]**

1. Go to https://dashboard.stripe.com/developers
2. Copy your API keys
3. Add to Dokploy API environment variables:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

4. In Stripe → Developers → Webhooks → Add: `https://api.timeo.my/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the webhook signing secret → paste as `STRIPE_WEBHOOK_SECRET`
6. Redeploy the API service

### What's Already Configured **[DONE]**

- Revenue Monster SDK integration in `packages/payments/`
- Stripe integration in `packages/payments/`
- Webhook handlers at `/webhooks/stripe` and `/webhooks/revenue-monster`
- Payment flow: create order → RM/Stripe payment → webhook → update order

---

## Phase 7: Mobile App Publishing

### What's Already Configured **[DONE]**

| Item | Status |
|------|--------|
| EAS project IDs | Set for admin, staff, customer, platform |
| Build profiles | development, preview, production configured |
| API URLs in eas.json | Updated to `https://api.timeo.my` for preview/production |
| App schemes | `timeo-admin`, `timeo-staff`, `timeo-customer`, `timeo-platform` |
| Submit config | Android internal track configured |
| Convex references | All removed from eas.json and app.config.ts |

### Mobile App Summary

| App | Bundle ID | Directory |
|-----|-----------|-----------|
| Timeo Admin | `my.timeo.admin` | `apps/admin` |
| Timeo Staff | `my.timeo.staff` | `apps/staff` |
| Timeo Customer | `my.timeo.app` | `apps/customer` |
| Timeo Platform | `my.timeo.platform` | `apps/platform` |

### Step 26 — Build for Android **[YOU]**

```bash
# Build each app (run from monorepo root)
cd apps/admin && eas build --platform android --profile production && cd ../..
cd apps/staff && eas build --platform android --profile production && cd ../..
cd apps/customer && eas build --platform android --profile production && cd ../..
cd apps/platform && eas build --platform android --profile production && cd ../..
```

Each build takes ~10-15 minutes. Track progress at https://expo.dev.

### Step 27 — Publish to Google Play **[YOU]**

**First time setup:**

1. Create a Google Play Console account ($25 one-time) at https://play.google.com/console
2. Create 4 app listings (one per app)
3. Create a Google Cloud Service Account:
   - Google Cloud Console → IAM → Service Accounts
   - Create account with "Service Account User" role
   - Generate JSON key → save as `google-service-account.json` in each app directory
   - In Play Console → Settings → API Access → link the service account

**Submit:**

```bash
cd apps/admin && eas submit --platform android --profile production && cd ../..
cd apps/staff && eas submit --platform android --profile production && cd ../..
cd apps/customer && eas submit --platform android --profile production && cd ../..
cd apps/platform && eas submit --platform android --profile production && cd ../..
```

Or manually: download `.aab` from expo.dev → upload in Play Console → submit for review.

### Step 28 — Build for iOS **[YOU]**

```bash
cd apps/admin && eas build --platform ios --profile production && cd ../..
cd apps/staff && eas build --platform ios --profile production && cd ../..
cd apps/customer && eas build --platform ios --profile production && cd ../..
cd apps/platform && eas build --platform ios --profile production && cd ../..
```

EAS will prompt for your Apple ID on the first build. It handles certificates and provisioning profiles automatically.

### Step 29 — Publish to App Store **[YOU]**

**First time setup:**

1. Apple Developer account ($99/year) at https://developer.apple.com
2. Create 4 apps in App Store Connect (https://appstoreconnect.apple.com)
3. Add to each app's `eas.json` under `submit.production.ios`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

**Submit:**

```bash
cd apps/admin && eas submit --platform ios --profile production && cd ../..
cd apps/staff && eas submit --platform ios --profile production && cd ../..
cd apps/customer && eas submit --platform ios --profile production && cd ../..
cd apps/platform && eas submit --platform ios --profile production && cd ../..
```

Apple review typically takes 24-48 hours.

### Step 30 — OTA Updates (Future) **[YOU]**

For JavaScript-only changes (no native code), push updates without store review:

```bash
cd apps/admin
eas update --branch production --message "Fix: checkout flow bug"
```

Users get the update on next app launch.

---

## Phase 8: Database Backups

### Step 31 — Set Up Automated Backups **[YOU]**

SSH into your VPS and add a daily cron job:

```bash
ssh root@YOUR_VPS_IP

# Create backup directory
mkdir -p /backups

# Add cron job (daily at 3 AM)
crontab -e
# Add this line:
0 3 * * * docker exec timeo-postgres pg_dump -U timeo timeo | gzip > /backups/timeo_$(date +\%Y\%m\%d).sql.gz

# Manual backup anytime
docker exec timeo-postgres pg_dump -U timeo timeo > /backups/manual_backup.sql

# Restore from backup
cat /backups/manual_backup.sql | docker exec -i timeo-postgres psql -U timeo timeo
```

---

## Checklist Summary

### Already Done (by Claude)

- [x] All TypeScript errors fixed (276 errors → 0)
- [x] Convex → api-client migration complete (all 5 mobile apps)
- [x] EAS configs updated (Convex URLs → API URLs)
- [x] App schemes configured (timeo-admin, timeo-staff, etc.)
- [x] EAS submit profiles added
- [x] Stale Convex references removed from app.config.ts files
- [x] `scripts/generate-secrets.sh` updated (generates all 4 secrets)
- [x] `.env.example` updated (all variables documented)
- [x] Docker Compose files verified (dev + prod)
- [x] CI/CD workflows verified (8 workflows in place)
- [x] C2 dashboard implemented (12 modules, 40+ API routes)
- [x] Auth middleware configured (Better Auth + RBAC)
- [x] Payment webhook handlers coded (Stripe + Revenue Monster)
- [x] Email integration coded (Nodemailer + Brevo SMTP)

### You Need To Do

- [ ] **Step 3** — Generate secrets for `.env`
- [ ] **Step 4** — Start Docker (PostgreSQL + Redis)
- [ ] **Step 5** — Run database migrations
- [ ] **Step 9** — Promote yourself to platform_admin
- [ ] **Step 12** — Buy a VPS
- [ ] **Step 13** — Point DNS to VPS
- [ ] **Step 14** — Install Dokploy
- [ ] **Step 15** — Generate production secrets
- [ ] **Steps 16-19** — Create 4 services in Dokploy (PG, Redis, API, Web)
- [ ] **Step 20** — Deploy and run migrations
- [ ] **Step 22** — Set GitHub secrets for CI/CD
- [ ] **Step 23** — Set up Brevo SMTP
- [ ] **Step 24** — Set up Revenue Monster
- [ ] **Steps 26-29** — Build and publish mobile apps
- [ ] **Step 31** — Set up database backups

---

## Quick Reference

```
LOCAL DEV
  API:     http://localhost:4000
  Web:     http://localhost:3000
  C2:      http://localhost:3000/admin
  PG:      localhost:5432  (timeo/timeo)
  Redis:   localhost:6379

PRODUCTION
  Web:     https://timeo.my
  API:     https://api.timeo.my
  C2:      https://timeo.my/admin
  Health:  https://api.timeo.my/health

COMMANDS
  pnpm --filter @timeo/api dev         Start API
  pnpm --filter @timeo/web dev         Start Web
  pnpm typecheck                       Check types (16/16 passing)
  ./scripts/generate-secrets.sh        Generate secrets
  eas build --platform android         Build Android
  eas build --platform ios             Build iOS
  eas submit --platform android        Submit to Google Play
  eas submit --platform ios            Submit to App Store

BUNDLE IDS
  Admin:    my.timeo.admin
  Staff:    my.timeo.staff
  Customer: my.timeo.app
  Platform: my.timeo.platform
```
