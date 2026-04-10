# Post-Deployment Verification Guide — Timeo Production

**Date:** 2026-04-11
**Status:** Ready for deployment verification
**QA Engineer:** Agent 54251e38-f719-4c4d-ac81-d98ec37d4dbb

---

## Overview

After infrastructure is deployed and DNS is configured, use this guide to verify all Timeo services are operational.

**Estimated time:** 15-20 minutes
**Success criteria:** All E2E tests pass on production domains

---

## Phase 1: Quick Infrastructure Verification (5 min)

### Step 1: Run the automated verification script

```bash
# From the Timeo project root
bash scripts/post-deploy-verify.sh https://timeo.my https://api.timeo.my
```

**Expected output:**
```
✓ PASS — API health endpoint returns 200
ℹ INFO — Health response: {"status":"healthy","timestamp":"2026-04-11T..."}
✓ PASS — DNS resolution works for timeo.my
✓ PASS — DNS resolution works for api.timeo.my
✓ PASS — CORS headers present on API
✓ PASS — Auth endpoint is responding (status: 400)
✓ PASS — Database is connected (via health endpoint)
✓ PASS — HTTP traffic redirects to HTTPS
✓ PASS — SSL certificate is valid
```

**If any checks fail:**
- Review the error message
- Check infrastructure checklist (infra configuration, DNS, env vars)
- Consult Dokploy logs: `docker logs <container-id>`

### Step 2: Manual health checks (optional)

```bash
# Test API health
curl https://api.timeo.my/health | jq .

# Expected:
# {
#   "status": "healthy",
#   "timestamp": "2026-04-11T13:45:00Z",
#   "database": "connected",
#   "redis": "connected"
# }

# Test CORS
curl -i -X OPTIONS https://api.timeo.my/api/tenants

# Expected: Headers include:
# access-control-allow-origin: https://timeo.my
# access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## Phase 2: E2E Test Execution (10 min)

### Prerequisites

```bash
# Ensure you're on the main branch
git checkout main

# Install dependencies (if not already done)
pnpm install
```

### Run all E2E tests

```bash
# Run all Playwright E2E tests
pnpm --filter @timeo/web exec playwright test --config=playwright.config.ts
```

**Expected output:**
```
Running 67 tests using 1 worker
  ✓ [1/67] auth.spec.ts › Sign Up › should create new user account
  ✓ [2/67] auth.spec.ts › Sign Up › should reject duplicate email
  ✓ [3/67] auth.spec.ts › Login › should log in with valid credentials
  ...
  ✓ [67/67] gym.spec.ts › Gym Management › should update gym member details

67 passed (45s)
```

**Test coverage:**
- `auth.spec.ts` — User registration, login, password reset, email verification (12 tests)
- `onboarding.spec.ts` — Business onboarding flow, tenant creation, user invitations (15 tests)
- `bookings.spec.ts` — Appointment booking, service selection, calendar view (18 tests)
- `gym.spec.ts` — Gym member registration, member details, check-ins (12 tests)
- `platform.spec.ts` — Platform admin dashboard, tenant management, user management (10 tests)

### Run specific test suites

If you want to test specific features:

```bash
# Auth flow only
pnpm --filter @timeo/web exec playwright test auth.spec.ts

# Onboarding flow
pnpm --filter @timeo/web exec playwright test onboarding.spec.ts

# Gym features
pnpm --filter @timeo/web exec playwright test gym.spec.ts

# Platform admin features
pnpm --filter @timeo/web exec playwright test platform.spec.ts
```

### Troubleshooting E2E Tests

**If tests fail:**

1. **Check environment variables:**
   ```bash
   # Verify Dokploy has correct env vars set
   curl -s https://api.timeo.my/health | jq .
   ```

2. **Review test logs:**
   ```bash
   # Run with verbose output
   pnpm --filter @timeo/web exec playwright test --reporter=list --verbose
   ```

3. **Debug specific test:**
   ```bash
   # Run single test with browser visible
   pnpm --filter @timeo/web exec playwright test auth.spec.ts --debug
   ```

4. **Check API logs:**
   ```bash
   # On VPS, view Dokploy API container logs
   docker logs <api-container-id> --tail=50 -f
   ```

---

## Phase 3: Manual Smoke Tests (5 min)

### Test 1: Sign-Up Flow

1. Navigate to https://timeo.my
2. Click "Sign Up"
3. Enter: email=`test-qa-@timeo.my`, password=`TestPass123!`
4. Verify: No validation errors
5. Click "Sign Up" button
6. Verify: "Check your email to verify your account" message

**Expected:** Email verification email arrives in Resend/SMTP logs within 30 seconds

### Test 2: Email Verification

1. Check email inbox or Resend logs for verification email
2. Click verification link
3. Verify: Page redirects to login page
4. Log in with email and password from Test 1
5. Verify: Dashboard loads (you're authenticated)

### Test 3: Business Onboarding (Admin Only)

1. Log in as `jabez@oxloz.com` (platform admin)
2. Navigate to C2 platform dashboard (top-right menu → Platform Admin)
3. Click "Tenant Management"
4. Click "Create Tenant"
5. Fill in: Name = "QA Test Gym", Industry = "Fitness", Contact Email = "admin@qatestgym.my"
6. Click "Create"
7. Verify: New tenant appears in list with active status

### Test 4: Multi-Tenancy Isolation

1. Create two test tenants (Test 1 and Test 2)
2. Create users in each tenant
3. Log in to Test 1 as user1
4. Access API: `curl -b cookies.txt https://api.timeo.my/api/tenants/test-1/services`
5. Verify: Returns services for Test 1 only
6. Switch to Test 2 user
7. Verify: Cannot access Test 1 data (401 Unauthorized or 403 Forbidden)

### Test 5: Payment Sandbox (if Revenue Monster configured)

1. In a test tenant, create a test order
2. Proceed to payment
3. Verify: Redirected to Revenue Monster payment page (sandbox)
4. Verify: Payment page shows correct order amount
5. Complete test payment
6. Verify: Webhook received and order status updated to "paid"

---

## Phase 4: Monitor Production Metrics (Ongoing)

### Setup Monitoring Tools

Once live, set up these monitoring tools:

1. **Uptime Kuma** (health checks)
   ```bash
   # Every 5 minutes, check:
   - https://api.timeo.my/health (should return 200)
   - https://timeo.my (should return 200)
   ```

2. **Grafana** (metrics dashboard)
   - Monitor: API response times, error rates, database connections, Redis memory
   - Targets: Prometheus scrape from Dokploy metrics endpoint

3. **Application Logs**
   ```bash
   # View logs via Dokploy UI or SSH
   docker logs <api-container-id> -f
   docker logs <web-container-id> -f
   ```

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p95) | < 200ms | > 500ms |
| Error Rate | < 0.1% | > 0.5% |
| Database Connections | < 10/sec | > 20/sec |
| Redis Memory | < 500MB | > 750MB |
| Disk Space (logs) | > 10GB free | < 5GB free |
| SSL Cert Expiry | > 30 days | < 14 days |

---

## Phase 5: Rollback Plan

If something goes wrong:

### Option 1: Dokploy Rollback (Fastest)

```bash
# Via Dokploy UI:
1. Navigate to applicationId KH114M6kwj02WRunDey1x (web) or JumiDwQeQKTMZOM02qDG7 (API)
2. Click "Deployments" tab
3. Find previous deployment (before the breaking change)
4. Click "Rollback"
5. Confirm

# Time: < 1 minute
```

### Option 2: DNS Revert

```bash
# If infrastructure is compromised:
1. Revert DNS A records for timeo.my and api.timeo.my to previous IP
2. Time: < 1 minute to propagate
```

### Option 3: Database Restore

```bash
# Database is backed up daily at 2 AM (see infra/cron/backup.cron)
# Restore procedure:
docker compose -f docker-compose.prod.yml exec postgres pg_restore -d timeo /backups/timeo-latest.sql
```

---

## Sign-Off

- **Infrastructure Deployed:** ⏳ (fill in date/time)
- **Verification Script Passed:** ⏳ (sign when complete)
- **E2E Tests Passed:** ⏳ (sign when complete)
- **Manual Smoke Tests Passed:** ⏳ (sign when complete)
- **Monitoring Configured:** ⏳ (sign when complete)

**Go-Live Approval:**
- [ ] All checks passed
- [ ] No known issues or blockers
- [ ] Rollback plan understood and tested
- [ ] Monitoring alerts configured
- [ ] Oncall team notified

**Approved by:** _____________ (QA Engineer / Infrastructure Team Lead)

---

## Support

For issues during verification, contact:
- **QA Issues:** QA Engineer (qa@timeo.my)
- **Infrastructure Issues:** DevOps/Platform Team
- **Database Issues:** DBA or Infrastructure Team Lead
