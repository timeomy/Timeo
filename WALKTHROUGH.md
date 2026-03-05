# Timeo — Complete Setup & Deployment Guide

> Every step tells you exactly **where** to run it.
>
> - **LOCAL** = your Mac terminal (in the Timeo project folder)
> - **VPS** = SSH'd into your production server
> - **BROWSER** = a web browser on your Mac
>
> Steps marked **DONE** are already configured. Steps marked **YOU** need your action.

---

## Phase 1: Local Development Setup

### Step 1 — Install Prerequisites [YOU / LOCAL]

Open Terminal on your Mac:

```bash
# Install pnpm (package manager)
npm install -g pnpm@9

# Install EAS CLI (for building mobile apps later)
npm install -g eas-cli

# Verify installations
pnpm --version    # should print 9.x.x
eas --version     # should print 14.x.x or higher
```

### Step 2 — Clone & Install Dependencies [YOU / LOCAL]

```bash
# If you haven't already cloned the repo:
git clone https://github.com/timeomy/Timeo.git
cd Timeo

# Install all dependencies across the monorepo
pnpm install
```

This installs dependencies for all 16 packages (apps + packages). Takes 1-2 minutes.

### Step 3 — Create Your Local .env File [YOU / LOCAL]

```bash
# Copy the template
cp .env.example .env

# Generate the two secrets and print them
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"
```

Open `.env` in your editor and replace these two lines with the values printed above:

```env
BETTER_AUTH_SECRET=<paste the generated value here>
JWT_SECRET=<paste the generated value here>
```

Everything else in `.env` already has correct defaults for local dev:

| Variable | Default | Why |
|----------|---------|-----|
| `DATABASE_URL` | `postgresql://timeo:timeo@localhost:5432/timeo` | Docker Compose creates this DB |
| `REDIS_URL` | `redis://localhost:6379` | Docker Compose creates this |
| `API_URL` | `http://localhost:4000` | Hono API server port |
| `SITE_URL` | `http://localhost:3000` | Next.js web server port |
| `NODE_ENV` | `development` | Enables dev features |

### Step 4 — Start PostgreSQL & Redis [YOU / LOCAL]

You need Docker Desktop installed. If you don't have it: https://www.docker.com/products/docker-desktop/

```bash
# Start the database containers (runs in background)
docker compose up -d postgres redis

# Wait 5 seconds, then verify both are healthy
docker compose ps
```

Expected output:

```
NAME             IMAGE               STATUS
timeo-postgres   postgres:16-alpine  Up 10 seconds (healthy)
timeo-redis      redis:7-alpine      Up 10 seconds (healthy)
```

**What this does:** Starts PostgreSQL 16 on port 5432 and Redis 7 on port 6379. Both are only accessible from localhost (not the internet). Data persists in Docker volumes even if you restart.

**If postgres is "unhealthy":** Wait 15 seconds and run `docker compose ps` again. If still unhealthy:

```bash
docker compose logs postgres    # check for errors
```

### Step 5 — Run Database Migrations [YOU / LOCAL]

```bash
pnpm --filter @timeo/db exec drizzle-kit migrate
```

Expected output:

```
[drizzle-kit] Applying migrations...
[drizzle-kit] All migrations applied successfully!
```

**What this does:** Creates all 30+ tables in your local PostgreSQL (users, tenants, orders, products, etc.) plus RLS helper functions.

### Step 6 — Start the Dev Servers [YOU / LOCAL]

You need **two terminal windows/tabs** open, both in the `Timeo` folder:

**Terminal 1 — API server (Hono on port 4000):**

```bash
pnpm --filter @timeo/api dev
```

Wait until you see: `Server running on http://localhost:4000`

**Terminal 2 — Web app (Next.js on port 3000):**

```bash
pnpm --filter @timeo/web dev
```

Wait until you see: `Ready on http://localhost:3000`

### Step 7 — Verify Everything Works [YOU / LOCAL + BROWSER]

**In a third terminal (LOCAL):**

```bash
curl http://localhost:4000/health
```

Expected:

```json
{"success":true,"data":{"status":"ok","database":"connected","redis":"connected"}}
```

**In your browser (BROWSER):**

Go to http://localhost:3000 — you should see the Timeo login/signup page.

**Troubleshooting:**
- `ECONNREFUSED :4000` → Terminal 1 (API) isn't running or crashed. Check the terminal for errors.
- `ECONNREFUSED :5432` → Docker isn't running. Run `docker compose up -d postgres redis` again.
- Page loads but shows "Network error" → API is down. Check Terminal 1.

---

## Phase 2: Access the C2 Command Center

### Step 8 — Create Your Admin Account [YOU / BROWSER]

1. Go to http://localhost:3000/sign-up
2. Fill in your email and password
3. Click "Sign Up"

**Email verification:** Since SMTP isn't configured locally, the verification link will be printed in **Terminal 1** (the API terminal). Look for a line like:

```
[email] Verification URL: http://localhost:3000/verify-email?token=abc123...
```

Copy that URL and paste it in your browser to verify your account.

### Step 9 — Promote Yourself to Platform Admin [YOU / LOCAL]

Run this in any terminal on your Mac. Replace `YOUR_EMAIL` with the email you signed up with:

```bash
docker exec -it timeo-postgres psql -U timeo -d timeo -c "
  UPDATE tenant_memberships
  SET role = 'platform_admin'
  WHERE user_id = (
    SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'
  );
"
```

If the table doesn't exist yet or returns `UPDATE 0`, try inserting directly:

```bash
docker exec -it timeo-postgres psql -U timeo -d timeo -c "
  INSERT INTO tenant_memberships (user_id, tenant_id, role, status)
  SELECT id, (SELECT id FROM tenants LIMIT 1), 'platform_admin', 'active'
  FROM users WHERE email = 'YOUR_EMAIL@example.com'
  ON CONFLICT DO NOTHING;
"
```

### Step 10 — Open the C2 Dashboard [YOU / BROWSER]

Go to http://localhost:3000/admin

You now have access to all 12 C2 modules:

| Module | URL | Purpose |
|--------|-----|---------|
| Dashboard | `/admin` | KPIs, system health, activity feed |
| Tenants | `/admin/tenants` | Create, edit, suspend tenants |
| Users | `/admin/users` | View all users, force logout |
| Billing | `/admin/billing` | Manage subscription plans |
| Features | `/admin/features` | Toggle features per tenant |
| Config | `/admin/config` | Auth, email, payment settings |
| Analytics | `/admin/analytics` | Growth and revenue charts |
| Activity | `/admin/activity` | Audit trail of all actions |
| Health | `/admin/health` | API, DB, Redis status |
| Comms | `/admin/communications` | Announcements |
| Integrations | `/admin/integrations` | API keys |
| Data | `/admin/data` | Seed data, backups |

### Step 11 — Seed Feature Flags [YOU / BROWSER]

1. Go to http://localhost:3000/admin/data
2. Click "Seed Feature Flags"

This creates the default flags that control what features are available per tenant:

| Flag | Controls |
|------|----------|
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

## Phase 3: Buy & Prepare the VPS

> From here on, you're setting up the **production** server. Your local setup stays exactly as it is.

### Step 12 — Buy a VPS [YOU / BROWSER]

Go to one of these providers and order a VPS:

| Provider | Plan | Price | RAM | CPU | Storage | Link |
|----------|------|-------|-----|-----|---------|------|
| **Hetzner** (recommended) | CX22 | ~RM20/mo | 4 GB | 2 vCPU | 40 GB | https://www.hetzner.com/cloud |
| **Contabo** | VPS S | ~RM25/mo | 8 GB | 4 vCPU | 200 GB | https://contabo.com/en/vps/ |
| **DigitalOcean** | Basic | ~RM50/mo | 4 GB | 2 vCPU | 80 GB | https://www.digitalocean.com |

**Requirements:**
- **OS:** Ubuntu 22.04 or 24.04 LTS (select during purchase)
- **Region:** Singapore (closest to Malaysia) if available
- **Authentication:** SSH key (recommended) or password

After purchase, you'll receive an **IP address** (e.g. `165.22.51.100`). Save it — you'll need it everywhere.

### Step 13 — SSH Into the VPS for the First Time [YOU / LOCAL]

From your Mac terminal:

```bash
ssh root@YOUR_VPS_IP
# e.g. ssh root@165.22.51.100
```

If using a password, enter it when prompted. If using SSH key, it connects automatically.

You're now **on the VPS**. The prompt changes to something like `root@ubuntu:~#`.

### Step 14 — Install Docker on the VPS [YOU / VPS]

Run these commands **on the VPS** (you should already be SSH'd in from Step 13):

```bash
# Update system packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify
docker --version        # Docker 24+ or 27+
docker compose version  # Docker Compose v2.x
```

### Step 15 — Install Dokploy on the VPS [YOU / VPS]

Still on the VPS:

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

This takes 2-3 minutes. It installs:
- **Dokploy** (deployment dashboard)
- **Traefik** (reverse proxy — handles SSL certificates and routing)

When finished, it prints a URL like:

```
Dokploy is ready! Access it at: http://YOUR_VPS_IP:3000
```

### Step 16 — Set Up Dokploy Admin Account [YOU / BROWSER]

1. Go to `http://YOUR_VPS_IP:3000` in your browser
2. Create your Dokploy admin account (email + password)
3. You're now in the Dokploy dashboard

**Important:** Dokploy uses port 3000 for its dashboard. After we deploy the Timeo web app, Timeo will use port 3000 inside its container, but Traefik will route based on domain name, not port — so there's no conflict.

### Step 17 — Point Your Domain to the VPS [YOU / BROWSER]

Log into your domain registrar where `timeo.my` is managed and add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` (or `timeo.my`) | `YOUR_VPS_IP` | 300 |
| A | `www` | `YOUR_VPS_IP` | 300 |
| A | `api` | `YOUR_VPS_IP` | 300 |

**Where to do this:**
- **Namecheap:** Domain List → Manage → Advanced DNS → Add New Record
- **Cloudflare:** DNS → Records → Add Record (set Proxy to "DNS only" / gray cloud)
- **GoDaddy:** My Domains → DNS → Add Record

**Verify DNS propagation (LOCAL):**

```bash
# Run from your Mac terminal (wait 5-30 minutes after adding records)
dig +short timeo.my        # should show YOUR_VPS_IP
dig +short api.timeo.my    # should show YOUR_VPS_IP
dig +short www.timeo.my    # should show YOUR_VPS_IP
```

If `dig` is not installed: `brew install bind` or use https://dnschecker.org

---

## Phase 4: Deploy to Production

### Step 18 — Generate Production Secrets [YOU / LOCAL]

Run this **on your Mac** (not the VPS):

```bash
cd ~/Timeo    # or wherever your Timeo repo is
./scripts/generate-secrets.sh
```

Output:

```
=== Timeo Production Secrets ===

BETTER_AUTH_SECRET=abc123xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=def456xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
POSTGRES_PASSWORD=ghi789xxxxxxxxxxxxxxxxxxxxxxxx
REDIS_PASSWORD=jkl012xxxxxxxxxxxxxxxxxxxxxxxx

Save these secrets securely. You will need them for Dokploy setup.
```

**Copy all 4 values somewhere safe** (password manager, secure note). You'll paste them in the next steps.

### Step 19 — Clone the Repo on the VPS [YOU / VPS]

SSH into the VPS (if not already connected):

```bash
ssh root@YOUR_VPS_IP
```

Then clone the repo:

```bash
# Create a directory for Timeo
mkdir -p /opt/timeo
cd /opt/timeo

# Clone the repo
git clone https://github.com/timeomy/Timeo.git .

# Verify
ls -la
# You should see: docker-compose.prod.yml, infra/, packages/, apps/, etc.
```

### Step 20 — Create the Production .env File [YOU / VPS]

Still on the VPS, create the `.env` file:

```bash
cd /opt/timeo
nano .env
```

Paste this entire block, replacing the placeholder values with your actual secrets from Step 18:

```env
# ─── Database ────────────────────────────────────────────────────────────────
POSTGRES_USER=timeo
POSTGRES_PASSWORD=PASTE_YOUR_POSTGRES_PASSWORD_HERE
POSTGRES_DB=timeo

# ─── Redis ───────────────────────────────────────────────────────────────────
REDIS_PASSWORD=PASTE_YOUR_REDIS_PASSWORD_HERE

# ─── Auth ────────────────────────────────────────────────────────────────────
BETTER_AUTH_SECRET=PASTE_YOUR_BETTER_AUTH_SECRET_HERE
JWT_SECRET=PASTE_YOUR_JWT_SECRET_HERE
SITE_URL=https://timeo.my
API_URL=https://api.timeo.my

# ─── Frontend (baked into Next.js bundle at build time) ──────────────────────
NEXT_PUBLIC_API_URL=https://api.timeo.my
NEXT_PUBLIC_SITE_URL=https://timeo.my

# ─── CORS ────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=https://timeo.my,https://www.timeo.my

# ─── Email (fill in after Phase 6) ──────────────────────────────────────────
EMAIL_FROM=noreply@timeo.my
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ─── Deployment ─────────────────────────────────────────────────────────────
NODE_ENV=production
PORT=4000
```

Save: `Ctrl+O`, then `Enter`, then `Ctrl+X`.

**Critical:** `BETTER_AUTH_SECRET` must be the **exact same value** in this .env file. Both the API and Web containers read from this same file, so it's automatically consistent.

### Step 21 — Create Docker Volumes [YOU / VPS]

Still on the VPS:

```bash
docker volume create pgdata
docker volume create redisdata
```

**What this does:** Creates persistent storage volumes for PostgreSQL and Redis. Your data survives container restarts, updates, and redeployments.

### Step 22 — Connect Dokploy's Traefik to Your Network [YOU / VPS]

Dokploy runs its own Traefik instance. We need to connect it to the `timeo-net` Docker network so it can route traffic to your containers:

```bash
# Create the network first
docker network create timeo-net

# Find Dokploy's Traefik container name
docker ps --filter "name=traefik" --format "{{.Names}}"
# Usually: dokploy-traefik or traefik

# Connect Traefik to our network (use the name from above)
docker network connect timeo-net dokploy-traefik
```

If the traefik container has a different name, use that name instead.

### Step 23 — Start All Production Services [YOU / VPS]

```bash
cd /opt/timeo

# Start PostgreSQL and Redis first (wait for healthy)
docker compose -f docker-compose.prod.yml up -d postgres redis

# Check they're healthy (wait 15 seconds)
docker compose -f docker-compose.prod.yml ps
```

Wait until both show `(healthy)` in the STATUS column. Then:

```bash
# Run database migrations
docker compose -f docker-compose.prod.yml run --rm migrate
```

Expected: `All migrations applied successfully!`

Then start the API and Web:

```bash
# Start API and Web services
docker compose -f docker-compose.prod.yml up -d api web

# Check all services
docker compose -f docker-compose.prod.yml ps
```

Expected output:

```
NAME             IMAGE                STATUS                   PORTS
timeo-postgres   postgres:16-alpine   Up 2 minutes (healthy)
timeo-redis      redis:7-alpine       Up 2 minutes (healthy)
timeo-api        timeo-api            Up 30 seconds (healthy)  4000/tcp
timeo-web        timeo-web            Up 20 seconds (healthy)  3000/tcp
```

**Note:** The first `docker compose up` builds the Docker images, which takes 3-5 minutes. Subsequent deploys are faster.

### Step 24 — Configure SSL Certificates [YOU / VPS]

Dokploy's Traefik should auto-generate Let's Encrypt SSL certificates for your domains. The Traefik labels in `docker-compose.prod.yml` tell Traefik:

- `api.timeo.my` routes to the API container (port 4000)
- `timeo.my` and `www.timeo.my` route to the Web container (port 3000)
- HTTP automatically redirects to HTTPS
- `www.timeo.my` redirects to `timeo.my`

If Traefik doesn't pick up the labels automatically, you may need to configure the cert resolver. Check:

```bash
# Check Traefik logs for certificate issues
docker logs dokploy-traefik 2>&1 | grep -i "certificate\|acme\|letsencrypt" | tail -20
```

If you see errors about the cert resolver `letsencrypt` not existing, you need to configure it in Dokploy:

1. Go to `http://YOUR_VPS_IP:3000` (Dokploy dashboard)
2. Settings → Certificates → Add Let's Encrypt
3. Enter your email address
4. Save

### Step 25 — Verify Production [YOU / LOCAL + BROWSER]

**From your Mac terminal (LOCAL):**

```bash
# Check API health
curl https://api.timeo.my/health
# Expected: {"success":true,"data":{"status":"ok","database":"connected","redis":"connected"}}

# Check web app
curl -I https://timeo.my
# Expected: HTTP/2 200
```

**In your browser (BROWSER):**

1. Go to https://timeo.my — you should see the Timeo login page
2. Go to https://timeo.my/sign-up — create your production account
3. Check VPS terminal for verification email link (same as Step 8, until SMTP is configured)

**Promote yourself to admin on production (VPS):**

```bash
ssh root@YOUR_VPS_IP

docker exec -it timeo-postgres psql -U timeo -d timeo -c "
  UPDATE tenant_memberships
  SET role = 'platform_admin'
  WHERE user_id = (
    SELECT id FROM users WHERE email = 'YOUR_EMAIL@example.com'
  );
"
```

4. Go to https://timeo.my/admin — your production C2 is live!

**Troubleshooting:**

| Problem | Likely Cause | Fix (run on VPS) |
|---------|-------------|-------------------|
| `ERR_CONNECTION_REFUSED` | Containers not running | `docker compose -f docker-compose.prod.yml ps` |
| `502 Bad Gateway` | Traefik can't reach containers | `docker network connect timeo-net dokploy-traefik` |
| `ERR_SSL_PROTOCOL_ERROR` | No SSL cert yet | Wait 2 min, check Traefik logs |
| `DNS_PROBE_FINISHED_NXDOMAIN` | DNS not propagated | Check `dig +short timeo.my` |
| API health fails | Database issue | `docker compose -f docker-compose.prod.yml logs api` |

---

## Phase 5: CI/CD Auto-Deploy

### What's Already Configured [DONE]

These GitHub Actions workflows exist in `.github/workflows/`:

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `ci.yml` | PR to `main` | Lint + typecheck + build |
| `deploy-backend.yml` | Push to `main` (API changes) | Triggers Dokploy API rebuild |
| `deploy-web.yml` | Push to `main` (web changes) | Triggers Dokploy web rebuild |
| `typecheck.yml` | PR to `main` | Full monorepo typecheck |
| `api-tests.yml` | Push/PR (API changes) | Vitest integration tests |
| `e2e.yml` | Push/PR | Playwright E2E tests |
| `eas-build.yml` | Manual trigger | Mobile EAS builds |
| `eas-update.yml` | Push to `main` | Mobile OTA updates |

### Step 26 — Set Up GitHub Secrets [YOU / BROWSER]

Go to https://github.com/timeomy/Timeo/settings/secrets/actions

Click "New repository secret" for each:

| Secret Name | Where to Get the Value |
|-------------|----------------------|
| `DOKPLOY_TOKEN` | Dokploy dashboard (`http://YOUR_VPS_IP:3000`) → Settings → API → Generate Token |
| `DOKPLOY_WEBHOOK_URL` | Dokploy → Create an Application service for API → Settings → Webhook URL |
| `DOKPLOY_WEB_WEBHOOK_URL` | Dokploy → Create an Application service for Web → Settings → Webhook URL |
| `EXPO_TOKEN` | https://expo.dev → Account Settings → Access Tokens → Create |

**About the Dokploy webhook approach:** The CI/CD workflows call `curl` on the webhook URL to trigger a rebuild. This is an alternative to the docker-compose approach in Phase 4. You can use **either**:

- **Docker Compose (Phase 4):** Manual deploys via `git pull && docker compose up -d --build` on VPS
- **Dokploy webhooks (this phase):** Automatic deploys on every push to `main`

To use the webhook approach, you'd create separate Application services in Dokploy (not docker-compose). For simplicity, you can skip the webhooks and redeploy manually:

```bash
# Manual redeploy on VPS — run whenever you push new code
ssh root@YOUR_VPS_IP
cd /opt/timeo
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build api web
```

---

## Phase 6: Email Setup (Brevo SMTP)

> Brevo (formerly Sendinblue) is a free email service — 300 emails/day on the free tier.
> Timeo uses it for: email verification, password reset, and transactional notifications.

### What's Already Coded [DONE]

- Nodemailer integration in `packages/auth/src/email.ts`
- Better Auth hooks for verification & password reset emails
- Email templates manageable from C2 → `/admin/communications`
- Dev mode fallback: prints verification links to API terminal when SMTP is not configured

### Step 27 — Create a Brevo Account [YOU / BROWSER]

1. Go to https://app.brevo.com
2. Click **Sign Up Free**
3. Fill in:
   - Email: your email (e.g. `jabez@oxloz.com`)
   - Password: choose a strong password
   - Company: `Timeo` (or your company name)
4. Click **Create an account**
5. Check your inbox for Brevo's confirmation email → click the link to verify
6. Complete the onboarding questionnaire:
   - Company name, industry, team size (doesn't matter much — pick anything)
   - Select "Transactional emails" when asked what you want to use Brevo for

### Step 28 — Authenticate Your Domain [YOU / BROWSER — Brevo + DNS Registrar]

This step makes emails come from `noreply@timeo.my` instead of `@brevosend.com`. **Without this, Gmail and Yahoo will likely flag your emails as spam.**

**In Brevo (BROWSER):**

1. Click your name (top-right) → **Settings**
2. In the left sidebar, find **Senders, Domains & Dedicated IPs** → click **Domains**
3. Click **Add a domain**
4. Enter: `timeo.my`
5. Click **Authenticate this domain**
6. Brevo shows you **DNS records** to add. You'll see something like:

| Record # | Type | Name | Value |
|----------|------|------|-------|
| 1 | TXT | `mail._domainkey.timeo.my` | `v=DKIM1; k=rsa; p=MIGfMA0GCS...` (long string) |
| 2 | TXT | `timeo.my` | `v=spf1 include:sendinblue.com ~all` |
| 3 | TXT | `_dmarc.timeo.my` | `v=DMARC1; p=none` |

**Keep this Brevo page open** — you'll come back to verify after adding the DNS records.

**In your DNS registrar (BROWSER — Namecheap / Cloudflare / GoDaddy):**

7. Log into wherever you manage `timeo.my` DNS
8. Add each DNS record exactly as Brevo shows:

**If using Namecheap:**
- Domain List → Manage → Advanced DNS → Add New Record
- Type: TXT Record
- Host: `mail._domainkey` (Namecheap auto-appends `.timeo.my`)
- Value: paste the DKIM value from Brevo
- TTL: Automatic
- Repeat for the SPF and DMARC records

**If using Cloudflare:**
- DNS → Records → Add Record
- Type: TXT
- Name: `mail._domainkey`
- Content: paste the DKIM value
- Proxy: DNS only (gray cloud)
- Repeat for SPF and DMARC

**If using GoDaddy:**
- My Domains → DNS → Add Record
- Type: TXT
- Name: `mail._domainkey`
- Value: paste the DKIM value
- Repeat for SPF and DMARC

9. **Go back to Brevo** and click **Verify** / **Check DNS Records**
   - DNS propagation can take 5-30 minutes
   - If it says "Not verified", wait 10 minutes and try again
   - Once verified, you'll see green checkmarks next to each record

**Verify from your Mac terminal (LOCAL):**

```bash
# Check DKIM record
dig +short TXT mail._domainkey.timeo.my
# Should return a long string starting with "v=DKIM1; k=rsa; p=..."

# Check SPF record
dig +short TXT timeo.my | grep spf
# Should include "include:sendinblue.com"
```

### Step 29 — Generate Your SMTP Key [YOU / BROWSER — Brevo]

1. In Brevo → click your name (top-right) → **Settings**
2. In the left sidebar → **SMTP & API**
3. Click the **SMTP Keys** tab (not API Keys — they're different!)
4. Click **Generate a new SMTP key**
5. Name: `timeo-production`
6. Click **Generate**
7. **Copy the SMTP key immediately** — you won't be able to see it again after closing the dialog

You now have these 4 values:

| Field | Value |
|-------|-------|
| **SMTP Server** | `smtp-relay.brevo.com` |
| **Port** | `587` |
| **Login** | Your Brevo account email (e.g. `jabez@oxloz.com`) |
| **SMTP Key** | The key you just generated (starts with `xsmtpsib-...`) |

**Important:** The SMTP key is NOT the same as an API key. Make sure you're on the **SMTP Keys** tab, not the API Keys tab.

### Step 30 — Add SMTP to Local Dev [YOU / LOCAL]

```bash
cd ~/Timeo
nano .env
```

Add or update these lines:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-login-email>
SMTP_PASS=<your-brevo-smtp-key>
EMAIL_FROM=noreply@timeo.my
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`).

Restart the API server (in the terminal where it's running, press `Ctrl+C`, then):

```bash
pnpm --filter @timeo/api dev
```

### Step 31 — Test Email Locally [YOU / BROWSER]

1. Go to http://localhost:3000/sign-up
2. Sign up with a **real email address** you can check (different from your existing account)
3. Check your inbox — you should receive an email from `noreply@timeo.my` with a verification link
4. Click the link to verify your email

**If the email doesn't arrive:**

| Problem | Fix |
|---------|-----|
| Check spam/junk folder | Gmail sometimes flags new sender domains |
| `EAUTH` error in API terminal | SMTP key is wrong — regenerate in Brevo |
| `ESOCKET` or `ECONNREFUSED` | Firewall blocking port 587 — try port 465 with `SMTP_PORT=465` |
| Email arrives from `@brevosend.com` | Domain not verified — go back to Step 28 |
| No error, no email | Check Brevo dashboard → Transactional → Logs to see if it was sent |

### Step 32 — Add SMTP to Production [YOU / VPS]

```bash
ssh root@YOUR_VPS_IP
cd /opt/timeo
nano .env
```

Find the email section (around the bottom) and fill in the same values:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-login-email>
SMTP_PASS=<your-brevo-smtp-key>
EMAIL_FROM=noreply@timeo.my
```

Save (`Ctrl+O`, `Enter`, `Ctrl+X`), then restart the API:

```bash
docker compose -f docker-compose.prod.yml up -d api
```

### Step 33 — Verify Production Email [YOU / BROWSER]

1. Go to https://timeo.my/sign-up
2. Sign up with a real email
3. Check your inbox for the verification email from `noreply@timeo.my`
4. If no email arrives, check the API logs:

```bash
# On VPS
docker compose -f docker-compose.prod.yml logs api | grep -i "email\|smtp\|mail" | tail -20
```

5. You can also check **Brevo dashboard** → **Transactional** → **Logs** to see all sent emails, delivery status, and bounce reasons

---

## Phase 7: Payment Gateway

### Step 34 — Revenue Monster Setup (Malaysia) [YOU / BROWSER + VPS]

**BROWSER:**

1. Sign up at https://merchant.revenuemonster.my
2. Complete merchant verification (business registration required)
3. Go to **Developer** → **Applications** → Create an application
4. Note your **Client ID** and **Client Secret**
5. Download your **Private Key** (.pem file)
6. Go to **Webhooks** → Add endpoint: `https://api.timeo.my/webhooks/revenue-monster`

**VPS:**

```bash
ssh root@YOUR_VPS_IP
cd /opt/timeo

# Create a keys directory and upload your RM private key
mkdir -p keys
nano keys/rm-private.pem
# Paste the contents of your .pem file, save and exit

# Edit .env to add RM credentials
nano .env
```

Add these lines:

```env
REVENUE_MONSTER_CLIENT_ID=your-client-id
REVENUE_MONSTER_CLIENT_SECRET=your-client-secret
REVENUE_MONSTER_PRIVATE_KEY_PATH=/app/keys/rm-private.pem
REVENUE_MONSTER_STORE_ID=your-store-id
REVENUE_MONSTER_ENVIRONMENT=sandbox
```

**Note:** Start with `sandbox` for testing. Change to `production` when ready to accept real payments.

Restart the API:

```bash
docker compose -f docker-compose.prod.yml up -d api
```

### Step 35 — Stripe Setup (Optional — International Payments) [YOU / BROWSER + VPS]

**BROWSER:**

1. Go to https://dashboard.stripe.com/developers
2. Copy your **Secret Key** (`sk_live_...` or `sk_test_...`)
3. Go to **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://api.timeo.my/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the **Signing Secret** (`whsec_...`)

**VPS:**

```bash
ssh root@YOUR_VPS_IP
cd /opt/timeo
nano .env
```

Add:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Restart:

```bash
docker compose -f docker-compose.prod.yml up -d api web
# web needs restart because NEXT_PUBLIC_ vars are baked into the JS bundle
docker compose -f docker-compose.prod.yml up -d --build web
```

**What's already coded [DONE]:**
- Revenue Monster SDK in `packages/payments/`
- Stripe integration in `packages/payments/`
- Webhook handlers at `/webhooks/stripe` and `/webhooks/revenue-monster`

---

## Phase 8: Mobile App Publishing

### What's Already Configured [DONE]

| Item | Status |
|------|--------|
| EAS project IDs | Set for all 4 apps |
| Build profiles | `development`, `preview`, `production` |
| API URLs in `eas.json` | `https://api.timeo.my` for preview/production |
| App schemes | `timeo-admin`, `timeo-staff`, `timeo-customer`, `timeo-platform` |
| Android submit config | Internal track configured |

### The 4 Mobile Apps

| App | Bundle ID | Directory | Who Uses It |
|-----|-----------|-----------|-------------|
| Timeo Admin | `my.timeo.admin` | `apps/admin` | Business owners |
| Timeo Staff | `my.timeo.staff` | `apps/staff` | Employees |
| Timeo Customer | `my.timeo.app` | `apps/customer` | End customers |
| Timeo Platform | `my.timeo.platform` | `apps/platform` | Platform admins (you) |

### Step 36 — Log In to Expo & EAS [YOU / LOCAL]

```bash
# Log in to your Expo account
eas login
# Enter your Expo username and password (account: oxloz)

# Verify you're logged in
eas whoami
```

### Step 37 — Build Android APKs [YOU / LOCAL]

Run from the Timeo root folder on your Mac:

```bash
# Build all 4 Android apps (each takes ~10-15 minutes)
# EAS builds run on Expo's cloud servers, not your Mac

cd apps/admin
eas build --platform android --profile production --non-interactive
cd ../..

cd apps/staff
eas build --platform android --profile production --non-interactive
cd ../..

cd apps/customer
eas build --platform android --profile production --non-interactive
cd ../..

cd apps/platform
eas build --platform android --profile production --non-interactive
cd ../..
```

**What happens:** Each command uploads your code to Expo's build servers. They compile the Android app and produce an `.aab` (Android App Bundle) file. Track progress at https://expo.dev.

### Step 38 — Create Google Play Listings [YOU / BROWSER]

1. **Google Play Console** — https://play.google.com/console
   - Sign up if you haven't ($25 one-time developer fee)
   - Create 4 app listings (one per app)
   - Fill in: app name, description, screenshots, icon, privacy policy URL

2. **Google Cloud Service Account** (for automated submissions):
   - Go to https://console.cloud.google.com
   - IAM & Admin → Service Accounts → Create
   - Name: `timeo-eas-submit`
   - Role: "Service Account User"
   - Keys → Add Key → JSON → Download
   - Save the JSON file as `google-service-account.json`
   - In Play Console → Settings → API Access → Link the service account

### Step 39 — Submit to Google Play [YOU / LOCAL]

```bash
# Submit each built app to Google Play internal testing track
cd apps/admin
eas submit --platform android --profile production
cd ../..

cd apps/staff
eas submit --platform android --profile production
cd ../..

cd apps/customer
eas submit --platform android --profile production
cd ../..

cd apps/platform
eas submit --platform android --profile production
cd ../..
```

Or manually: download the `.aab` from https://expo.dev → upload in Play Console → submit for review.

### Step 40 — Build iOS Apps [YOU / LOCAL]

```bash
cd apps/admin
eas build --platform ios --profile production --non-interactive
cd ../..

cd apps/staff
eas build --platform ios --profile production --non-interactive
cd ../..

cd apps/customer
eas build --platform ios --profile production --non-interactive
cd ../..

cd apps/platform
eas build --platform ios --profile production --non-interactive
cd ../..
```

**First iOS build:** EAS will ask for your Apple ID. It automatically manages certificates and provisioning profiles. You need an Apple Developer account ($99/year) — sign up at https://developer.apple.com.

### Step 41 — Submit to App Store [YOU / BROWSER + LOCAL]

**BROWSER — Create App Store listings:**

1. Go to https://appstoreconnect.apple.com
2. My Apps → "+" → New App (create 4 apps)
3. Fill in: name, description, screenshots, icon, privacy policy, age rating
4. Note each app's **Apple ID** (numeric) and your **Team ID**

**LOCAL — Update EAS submit config:**

For each app, add the iOS submit config to its `eas.json`. Example for admin:

```bash
cd apps/admin
```

Edit `eas.json` and add under `submit.production`:

```json
{
  "submit": {
    "production": {
      "android": { "track": "internal" },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

Then submit:

```bash
cd apps/admin
eas submit --platform ios --profile production
cd ../..

# Repeat for staff, customer, platform
```

Apple review takes 24-48 hours.

### Step 42 — OTA Updates (After Initial Publish) [YOU / LOCAL]

For JavaScript-only changes (no native module changes), push updates without store review:

```bash
cd apps/admin
eas update --branch production --message "Fix: checkout flow bug"
cd ../..
```

Users get the update on next app launch. No store review needed.

---

## Phase 9: Database Backups

### Step 43 — Set Up Daily Automated Backups [YOU / VPS]

```bash
ssh root@YOUR_VPS_IP
cd /opt/timeo

# Test the backup script works
docker compose -f docker-compose.prod.yml run --rm backup
# Expected: "[...] Backup complete"

# Check the backup was created
docker volume inspect backupdata --format '{{ .Mountpoint }}'
# Then: ls <that path>
```

Now set up the daily cron job:

```bash
# Open crontab editor
crontab -e
```

Add this line at the bottom:

```
0 2 * * * cd /opt/timeo && docker compose -f docker-compose.prod.yml run --rm backup >> /var/log/timeo-backup.log 2>&1
```

Save and exit. This runs a backup every day at 2:00 AM server time.

**Verify the cron job was saved:**

```bash
crontab -l
```

### Step 44 — How to Restore from Backup [REFERENCE / VPS]

If you ever need to restore:

```bash
ssh root@YOUR_VPS_IP
cd /opt/timeo

# List available backups
docker run --rm -v backupdata:/backups alpine ls -la /backups/

# Restore from a specific backup (WARNING: destroys current data)
docker compose -f docker-compose.prod.yml run --rm \
  -v ./infra/scripts:/scripts \
  -v backupdata:/backups \
  backup /scripts/restore.sh /backups/timeo-2026-03-05.sql.gz
```

---

## Quick Reference Card

```
LOCAL DEVELOPMENT (your Mac)
  Web:     http://localhost:3000
  API:     http://localhost:4000
  C2:      http://localhost:3000/admin
  PG:      localhost:5432 (timeo/timeo)
  Redis:   localhost:6379

PRODUCTION (your VPS)
  Web:     https://timeo.my
  API:     https://api.timeo.my
  C2:      https://timeo.my/admin
  Health:  https://api.timeo.my/health
  Dokploy: http://YOUR_VPS_IP:3000

COMMON COMMANDS (LOCAL — your Mac)
  pnpm --filter @timeo/api dev              Start API dev server
  pnpm --filter @timeo/web dev              Start web dev server
  pnpm typecheck                            Check all types (16 packages)
  ./scripts/generate-secrets.sh             Generate production secrets
  eas build --platform android              Build Android app
  eas build --platform ios                  Build iOS app
  eas submit --platform android             Submit to Google Play
  eas submit --platform ios                 Submit to App Store

COMMON COMMANDS (VPS — via SSH)
  cd /opt/timeo
  docker compose -f docker-compose.prod.yml ps           Check service status
  docker compose -f docker-compose.prod.yml logs api     View API logs
  docker compose -f docker-compose.prod.yml logs web     View web logs
  docker compose -f docker-compose.prod.yml up -d --build api   Rebuild & restart API
  docker compose -f docker-compose.prod.yml up -d --build web   Rebuild & restart web
  docker compose -f docker-compose.prod.yml run --rm migrate    Run DB migrations
  docker compose -f docker-compose.prod.yml run --rm backup     Manual backup
  git pull origin main                                          Pull latest code

BUNDLE IDS
  Admin:    my.timeo.admin
  Staff:    my.timeo.staff
  Customer: my.timeo.app
  Platform: my.timeo.platform
```

---

## Already Done (by Claude)

- [x] All 276 TypeScript errors fixed (Convex → api-client migration)
- [x] All 5 mobile apps migrated to TanStack Query hooks
- [x] EAS configs updated (removed Convex URLs, added API URLs)
- [x] App schemes configured (timeo-admin, timeo-staff, etc.)
- [x] `scripts/generate-secrets.sh` generates all 4 secrets
- [x] `.env.example` documents all variables
- [x] `docker-compose.yml` for local dev (PostgreSQL + Redis)
- [x] `docker-compose.prod.yml` for production (PostgreSQL + Redis + API + Web + Traefik labels + SSL)
- [x] `infra/api/Dockerfile` multi-stage Hono API build
- [x] `infra/web/Dockerfile` multi-stage Next.js build
- [x] `infra/postgres/init.sql` RLS helper functions
- [x] `infra/scripts/backup.sh` daily backup with S3 support
- [x] `infra/scripts/restore.sh` database restore with safety checks
- [x] `infra/cron/backup.cron` cron job template
- [x] 8 GitHub Actions workflows (CI, deploy, E2E, EAS)
- [x] C2 dashboard (12 modules, 40+ API routes)
- [x] Auth middleware (Better Auth + RBAC)
- [x] Payment webhook handlers (Stripe + Revenue Monster)
- [x] Email integration (Nodemailer + Brevo SMTP)
