#!/usr/bin/env bash
#
# Generate secure random secrets for Timeo production deployment.
# Run this locally and copy the output into your .env on the VPS.
#

set -euo pipefail

BETTER_AUTH_SECRET=$(openssl rand -base64 48)
JWT_SECRET=$(openssl rand -base64 48)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+')
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+')

cat <<EOF
# ═══════════════════════════════════════════════════════════
# Timeo Production Environment Variables
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ═══════════════════════════════════════════════════════════

# ── Infrastructure Secrets ────────────────────────────────
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
JWT_SECRET=${JWT_SECRET}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}

# ── Database & Cache (auto-composed from passwords above) ─
POSTGRES_USER=timeo
POSTGRES_DB=timeo
DATABASE_URL=postgresql://timeo:${POSTGRES_PASSWORD}@postgres:5432/timeo
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ── URLs ──────────────────────────────────────────────────
API_URL=https://api.timeo.my
SITE_URL=https://timeo.my
NEXT_PUBLIC_API_URL=https://api.timeo.my
NEXT_PUBLIC_SITE_URL=https://timeo.my
ALLOWED_ORIGINS=https://timeo.my,https://www.timeo.my

# ── Email (Brevo SMTP) ───────────────────────────────────
# Sign up at https://brevo.com and get SMTP credentials
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your-brevo-smtp-login>
SMTP_PASS=<your-brevo-smtp-password>
EMAIL_FROM=noreply@timeo.my

# ── Stripe (optional — leave empty to defer) ─────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# ── Revenue Monster (optional — leave empty to defer) ────
RM_CLIENT_ID=
RM_CLIENT_SECRET=
RM_PRIVATE_KEY=

# ── Runtime ───────────────────────────────────────────────
NODE_ENV=production

# ═══════════════════════════════════════════════════════════
# Save this file securely. Do NOT commit it to git.
# ═══════════════════════════════════════════════════════════
EOF
