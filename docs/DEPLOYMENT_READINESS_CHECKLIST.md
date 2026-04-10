# Deployment Readiness Checklist — Timeo Production

**Status:** ✅ Code-complete, awaiting infrastructure configuration
**Date Updated:** 2026-04-10
**QA Verification:** All quality gates green (0 type errors, 128 API tests passing)

---

## Code Quality Gates ✅

- [x] **TypeScript:** 11 packages, 0 errors
- [x] **API Tests:** 128 passed + 12 todo = 140 total across 13 test files
- [x] **E2E Tests:** 67+ Playwright tests covering critical user flows
- [x] **Test Coverage:** 80%+ across codebase
- [x] **Security:** Better Auth configured, RLS policies in place, tenant isolation verified
- [x] **Docker:** Multi-stage Dockerfile verified, production-ready

---

## Infrastructure Configuration (BLOCKING)

**Before deployment to api.timeo.my + timeo.my:**

### 1. DNS Configuration
- [ ] Add A record for `api.timeo.my` pointing to VPS IP (Hostinger)
- [ ] Add A record for `timeo.my` pointing to VPS IP
- [ ] Verify DNS resolution: `nslookup api.timeo.my` + `nslookup timeo.my`

### 2. Environment Variables — API Service (Dokploy)
**Critical (blocks sign-up + email):**
- [ ] `RESEND_API_KEY` — Email delivery for auth, invitations, password resets
- [ ] `BETTER_AUTH_SECRET` — Session encryption (must be random, not dev placeholder)
- [ ] `JWT_SECRET` — JWT signing for API (must be random, not dev placeholder)

**Configuration:**
- [ ] `SITE_URL=https://timeo.my` — Used by Better Auth for cookie domain
- [ ] `API_URL=https://api.timeo.my` — Used by web app for API calls
- [ ] `DATABASE_URL` — PostgreSQL connection string for production database
- [ ] `REDIS_URL` — Redis connection string for sessions + queues
- [ ] `RM_SANDBOX_MODE=true` (if using Revenue Monster sandbox) or `false` for production
- [ ] `RM_PRIVATE_KEY` — Revenue Monster API key

**Verify:**
```bash
# Connect to Dokploy and verify env vars are set correctly
curl -X GET https://api.timeo.my/health
# Should return: { "status": "healthy", "timestamp": "2026-04-10T..." }
```

### 3. Environment Variables — Web Service (Dokploy)
- [ ] `NEXT_PUBLIC_SITE_URL=https://timeo.my`
- [ ] `NEXT_PUBLIC_API_URL=https://api.timeo.my`

### 4. Database Migrations (VPS PostgreSQL)
- [ ] Start Docker containers: `docker compose -f docker-compose.prod.yml up -d postgres redis`
- [ ] Run migrations: `docker compose -f docker-compose.prod.yml --profile migrate up migrate`
- [ ] Verify database is populated: `docker compose -f docker-compose.prod.yml exec postgres psql -U timeo -d timeo -c "\dt"`
- [ ] Check tables exist: tenants, users, sessions, accounts, services, appointments, etc.

**Verification Script:**
```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U timeo -d timeo << EOF
SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
EOF
```

### 5. Webhook Integrations
- [ ] **Stripe:** Update webhook URL to `https://api.timeo.my/webhooks/stripe`
  - Endpoint: `/api/webhooks/stripe`
  - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `invoice.payment_succeeded`
  - Signing key: `STRIPE_WEBHOOK_SECRET` (add to .env)

- [ ] **Revenue Monster:** Webhook endpoint `https://api.timeo.my/webhooks/revenue-monster` is operational
  - RM will POST payment confirmations here
  - API verifies request signature before processing

### 6. Health & Monitoring
- [ ] Verify health endpoint: `curl https://api.timeo.my/health`
- [ ] Check database connectivity: Health check includes `SELECT 1` to postgres
- [ ] Check Redis connectivity: Redis adapter in Socket.io should connect
- [ ] Verify CORS headers: Web app can reach API

**Test API connectivity from web:**
```bash
# In browser console on https://timeo.my
fetch('https://api.timeo.my/health').then(r => r.json()).then(console.log)
# Should not show CORS error
```

### 7. HTTPS & SSL
- [ ] Traefik reverse proxy configured with wildcard SSL (`*.timeo.my`)
- [ ] All traffic redirects to HTTPS
- [ ] Certificate auto-renewal via Let's Encrypt is enabled

---

## Pre-Launch E2E Verification

**Run once infrastructure is live:**

```bash
# 1. Health checks
curl https://api.timeo.my/health

# 2. Sign-up flow
# Navigate to https://timeo.my → Sign Up → Enter email + password
# Verify email is received (check Resend logs)
# Click verification link → Should redirect to login

# 3. Login flow
# Log in with verified email
# Verify session is created (check cookies)
# Verify authenticated API calls work

# 4. Business onboarding (C2 admin)
# Log in as jabez@oxloz.com (platform admin)
# Navigate to C2 → Tenant Management
# Create test tenant "QA Test Gym"
# Verify tenant is created in database

# 5. Multi-tenancy isolation
# Create 2 test tenants
# Log in to each as different users
# Verify each user cannot see the other's data (RLS)

# 6. Payment sandbox (Revenue Monster)
# Create order in test tenant
# Proceed to payment
# Verify RM payment page loads
# Verify webhook is received (check logs)

# 7. Email delivery
# Create user account
# Trigger password reset
# Verify email is received and link works
```

---

## Post-Deployment Monitoring

Once live, monitor:
- [ ] API response times (< 200ms p95)
- [ ] Error rate (< 0.1%)
- [ ] Database connection pool health
- [ ] Redis memory usage
- [ ] Disk space (backups, logs)
- [ ] SSL certificate expiry

**Tools:**
- Uptime Kuma (health checks every 5 min)
- Grafana (metrics dashboard)
- Application logs (Docker logs, Dokploy UI)

---

## Rollback Plan

If something goes wrong:
1. Dokploy has snapshot functionality — revert to previous deployment
2. Database: Automated daily backups at 2 AM (see `infra/cron/backup.cron`)
3. DNS: Can revert DNS if needed (< 1 min to propagate)

---

## Sign-off

**Code Quality:** ✅ QA Engineer verified all gates green (2026-04-10 10:14 GMT+8)
**Infrastructure:** ⏳ Awaiting configuration by DevOps/Platform team
**Ready for Deployment:** YES, once infrastructure checklist is completed

---

**Next Steps:**
1. Platform team: Complete infrastructure configuration checklist
2. QA Engineer: Run pre-launch E2E verification script
3. CEO: Announce go-live to customers
