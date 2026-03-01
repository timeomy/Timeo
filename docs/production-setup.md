# Production Setup Guide — Timeo on Dokploy

Step-by-step guide for deploying Timeo to a self-hosted VPS using Dokploy.

## Prerequisites

- A VPS (Ubuntu 22.04+ recommended, minimum 2GB RAM)
- [Dokploy](https://dokploy.com) installed on the VPS
- Domains pointing to the VPS IP:
  - `timeo.my` → VPS IP (A record)
  - `api.timeo.my` → VPS IP (A record)
- GitHub repository connected to Dokploy
- SSL certificates (Dokploy handles this via Let's Encrypt)

## 1. Generate Secrets

Run the helper script locally to generate secure random values:

```bash
./scripts/generate-secrets.sh
```

This outputs values for `BETTER_AUTH_SECRET` and `JWT_SECRET`. Save them — you'll need them for both API and web service configuration.

## 2. Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret | Description |
|--------|-------------|
| `DOKPLOY_TOKEN` | Dokploy API token (Settings → API → Generate Token) |
| `DOKPLOY_WEBHOOK_URL` | Webhook URL for the **API** service (Service → Settings → Webhooks) |
| `DOKPLOY_WEB_WEBHOOK_URL` | Webhook URL for the **Web** service (Service → Settings → Webhooks) |

## 3. Create Dokploy Services

### 3a. PostgreSQL

In Dokploy dashboard → **Create Service** → **Database** → **PostgreSQL**:

- Image: `postgres:16-alpine`
- Environment variables:
  ```
  POSTGRES_USER=timeo
  POSTGRES_PASSWORD=<strong-password>
  POSTGRES_DB=timeo
  ```
- Volume: `/var/lib/postgresql/data` (persistent)
- **Internal network only** — no public port needed (API connects via Docker network)

Note the internal hostname (e.g., `postgres-xxxx:5432`). Your `DATABASE_URL` will be:
```
postgresql://timeo:<password>@<internal-hostname>:5432/timeo
```

### 3b. Redis

In Dokploy dashboard → **Create Service** → **Database** → **Redis**:

- Image: `redis:7-alpine`
- **Internal network only** — no public port needed

Note the internal hostname. Your `REDIS_URL` will be:
```
redis://<internal-hostname>:6379
```

### 3c. API Service

**Create Service** → **Application**:

- Source: GitHub repository
- Branch: `main`
- Dockerfile path: `infra/api/Dockerfile`
- Build context: `.` (repository root)
- Domain: `api.timeo.my`
- Port: `4000`
- HTTPS: Enable (Let's Encrypt)

**Environment variables:**

```bash
# Database (use Dokploy internal hostname)
DATABASE_URL=postgresql://timeo:<password>@<postgres-hostname>:5432/timeo

# Redis (use Dokploy internal hostname)
REDIS_URL=redis://<redis-hostname>:6379

# Auth (use values from generate-secrets.sh)
BETTER_AUTH_SECRET=<generated-secret>
JWT_SECRET=<generated-secret>
SITE_URL=https://timeo.my
API_URL=https://api.timeo.my

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Revenue Monster (optional — skip if not using FPX/eWallets yet)
REVENUE_MONSTER_CLIENT_ID=
REVENUE_MONSTER_CLIENT_SECRET=
REVENUE_MONSTER_ENVIRONMENT=production

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@timeo.my

# Runtime
NODE_ENV=production
```

**Webhook:** Copy the webhook URL from Service → Settings → Webhooks and add it as `DOKPLOY_WEBHOOK_URL` in GitHub Secrets.

### 3d. Web Service

**Create Service** → **Application**:

- Source: GitHub repository
- Branch: `main`
- Dockerfile path: `infra/web/Dockerfile`
- Build context: `.` (repository root)
- Domain: `timeo.my` (also add `www.timeo.my`)
- Port: `3000`
- HTTPS: Enable (Let's Encrypt)

**Build arguments** (set in Dokploy build settings — these are baked into the Next.js bundle):

```bash
NEXT_PUBLIC_API_URL=https://api.timeo.my
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...        # optional
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Environment variables** (runtime):

```bash
# Auth (must match API service)
BETTER_AUTH_SECRET=<same-secret-as-api>
DATABASE_URL=postgresql://timeo:<password>@<postgres-hostname>:5432/timeo

# Frontend
NEXT_PUBLIC_API_URL=https://api.timeo.my
NEXT_PUBLIC_SITE_URL=https://timeo.my

# Runtime
NODE_ENV=production
```

**Webhook:** Copy the webhook URL and add it as `DOKPLOY_WEB_WEBHOOK_URL` in GitHub Secrets.

## 4. First Deployment

### Deploy API first

1. In Dokploy, trigger a manual deploy for the API service (or push to `main`)
2. Wait for the build to complete (check Dokploy logs)

### Run database migrations

SSH into the VPS and run migrations against the PostgreSQL container:

```bash
# Option A: Use the migrate profile in docker-compose
cd /path/to/timeo
docker compose --profile migrate up migrate

# Option B: Run drizzle-kit directly (if you have the repo checked out on VPS)
DATABASE_URL=postgresql://timeo:<password>@localhost:5432/timeo \
  pnpm --filter @timeo/db exec drizzle-kit migrate

# Option C: Connect to the Dokploy postgres and run from your local machine
DATABASE_URL=postgresql://timeo:<password>@<vps-ip>:5432/timeo \
  pnpm --filter @timeo/db exec drizzle-kit migrate
```

### Seed demo data (optional)

```bash
DATABASE_URL=postgresql://timeo:<password>@<host>:5432/timeo \
  pnpm --filter @timeo/db seed
```

### Deploy web

1. Trigger a manual deploy for the Web service in Dokploy
2. Wait for the Next.js build to complete

## 5. Verify

### API health check

```bash
curl https://api.timeo.my/health
# Expected: {"status":"ok","timestamp":"...","version":"..."}
```

### Web app

1. Visit `https://timeo.my`
2. Click **Sign Up** and create an account
3. Verify you receive a real verification email (via Resend)
4. Log in and create a tenant

### Stripe webhooks

Update your Stripe webhook endpoints to point to the new API:

- **Stripe Dashboard** → **Developers** → **Webhooks**
- Endpoint URL: `https://api.timeo.my/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.*`

For Stripe Connect:
- Endpoint URL: `https://api.timeo.my/webhooks/stripe/connect`

## 6. Subsequent Deployments

Deployments are automatic on `git push origin main`:

- **API changes** (`packages/api/`, `packages/db/`, `packages/auth/`, `infra/`):
  - `.github/workflows/deploy-backend.yml` triggers → calls `DOKPLOY_WEBHOOK_URL`
  - Dokploy pulls latest code, rebuilds `infra/api/Dockerfile`, restarts container

- **Web changes** (`apps/web/`, `packages/ui/`, `packages/shared/`, `packages/auth/`, `packages/api-client/`):
  - `.github/workflows/deploy-web.yml` triggers → calls `DOKPLOY_WEB_WEBHOOK_URL`
  - Dokploy pulls latest code, rebuilds `infra/web/Dockerfile`, restarts container

### Running migrations after schema changes

If you update the Drizzle schema (`packages/db/src/schema/`):

1. Generate migration locally: `pnpm --filter @timeo/db db:generate`
2. Commit the migration files in `packages/db/drizzle/`
3. Push to `main` (triggers API deploy)
4. SSH into VPS and run: `docker compose --profile migrate up migrate`

## Troubleshooting

### API won't start

```bash
# Check Dokploy logs for the API service
# Common issues:
# - DATABASE_URL wrong → "connection refused" or "auth failed"
# - REDIS_URL wrong → "ECONNREFUSED" on port 6379
# - Missing BETTER_AUTH_SECRET → crash on startup
```

### Web build fails

```bash
# Common issues:
# - Missing NEXT_PUBLIC_API_URL build arg → API calls fail in browser
# - BETTER_AUTH_SECRET mismatch between API and web → auth proxy 401s
```

### Auth not working

- Ensure `BETTER_AUTH_SECRET` is **identical** on both API and web services
- Ensure `SITE_URL` on the API matches the web domain (`https://timeo.my`)
- Check that cookies are being set with the correct domain (cross-subdomain)

### Database migrations fail

```bash
# Check postgres is running:
docker ps | grep postgres

# Check connectivity:
docker exec -it <postgres-container> psql -U timeo -d timeo -c "SELECT 1"

# Run migrations with verbose output:
DATABASE_URL=... pnpm --filter @timeo/db exec drizzle-kit migrate --verbose
```
