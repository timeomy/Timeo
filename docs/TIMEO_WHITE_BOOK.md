# Timeo White Book

Master technical reference for operating and rebuilding Timeo.

This document is based on the current repository (`apps/*`, `packages/*`, `infra/*`, `docs/*`) plus direct production inspection on `root@72.61.123.64` (Docker Swarm services + PostgreSQL metadata) as of 2026-04-09.

## 1) Architecture Overview

### Monorepo structure

- `apps/web` — Next.js 14 App Router web application.
- `apps/mobile` — Expo/React Native app (`expo-router`).
- `packages/api` — Hono API server, middleware, routes, jobs, webhooks.
- `packages/db` — Drizzle schema, relations, migrations, seed scripts.
- `packages/auth` — Better Auth server/client integration, email templates, auth providers.
- `packages/api-client` — shared API hooks/client (TanStack Query).
- `packages/ui` — shared design system/components (web + native).
- `packages/shared` — cross-cutting utilities/types.

### Tech stack (from code)

- Web: Next.js `14.2.25`, React 18, Tailwind CSS, shared UI primitives (`@timeo/ui`).
- API: Hono (`packages/api/src/app.ts`) on Node, Zod validation, Socket.IO.
- Database: PostgreSQL + Drizzle ORM (`packages/db`).
- Auth: Better Auth (`packages/auth/src/server.ts`) with credential/email flows.
- Data fetching: TanStack Query (`apps/web/components/providers.tsx`, `packages/api-client`).
- Mobile: Expo (`apps/mobile/package.json`), React Native, `expo-router`.

### Runtime and deployment model

- Production runtime is Docker Swarm services managed under Dokploy.
- Observed core services in prod:
  - `timeo-web-cnyu9o`
  - `timeo-api-ntlib8`
  - `timeo-postgres-pptpjz`
  - `timeo-redis-av4uy4`
- Dokploy edge/proxy in prod is Traefik (`dokploy-traefik` container).

## 2) Infrastructure

- Production host: `root@72.61.123.64`.
- Domains in active config/docs:
  - Web app: `app.timeo.my` (auth defaults), and `timeo.my` appears in deploy docs.
  - API: `api.timeo.my`.
  - Marketing: `timeo.my`.
- Docker services (core app):
  - `timeo-web-cnyu9o`
  - `timeo-api-ntlib8`
  - `timeo-postgres-pptpjz`
  - `timeo-redis-av4uy4`
- SSL/TLS: handled by Dokploy-managed Traefik edge.
- DNS: Cloudflare (operational setup).

## 3) Database

### Engine and credentials

- Engine: PostgreSQL.
- Database: `timeo`.
- DB user: `timeo`.

### Full schema listing (production `public` schema)

#### Migration metadata

- `__drizzle_migrations` — applied Drizzle migration history.

#### Auth (Better Auth)

- `user` — auth users (email identity, verification flag, timestamps).
- `account` — auth provider credentials/accounts (including credential password hash).
- `session` — auth sessions/tokens.
- `verification` — verification/reset tokens.

#### Core tenancy and identity

- `users` — app-level user profiles/roles (`auth_id` links to `user.id`).
- `tenants` — businesses/organizations.
- `tenant_memberships` — user↔tenant membership, role, status, coach assignment, member IDs.

#### Booking & scheduling

- `services` — service catalog per tenant.
- `bookings` — customer bookings.
- `booking_events` — booking event history.
- `staff_availability` — recurring staff availability.
- `business_hours` — tenant operating hours.
- `blocked_slots` — blocked booking windows.

#### Commerce, memberships, payments

- `products` — sellable products.
- `orders` — customer orders.
- `order_items` — line items for orders.
- `stock_movements` — inventory deltas/audit.
- `memberships` — membership plans.
- `payments` — payment records (Stripe/RM/manual metadata).
- `subscriptions` — active/canceled subscription state.
- `stripe_accounts` — tenant Stripe Connect state.
- `pos_transactions` — POS transaction records.
- `payment_requests` — member receipt uploads / DuitNow verification workflow.

#### Fitness, coaching, access

- `check_ins` — check-in events (`qr`, `nfc`, `manual`, `face`).
- `member_qr_codes` — generated member QR codes.
- `session_packages` — package definitions (session counts).
- `session_credits` — purchased/remaining credits.
- `session_logs` — coaching/session logs and metrics.
- `coach_availability` — coach scheduling blocks.
- `coach_bookings` — coach-client booking records.
- `exercises` — tenant exercise library.
- `coach_client_notes` — coach notes per client.
- `turnstile_devices` — gate/face terminal device registry.
- `face_registrations` — enrolled face mappings.
- `access_logs` — gate decision logs.
- `turnstile_events` — imported/raw turnstile events.
- `turnstile_face_logs` — imported/raw face logs.

#### Promotions, loyalty, notifications, files

- `vouchers` — voucher definitions.
- `voucher_redemptions` — voucher usage ledger.
- `gift_cards` — gift card balances/status.
- `gift_card_transactions` — gift card transaction ledger.
- `loyalty_points` — balance snapshots.
- `loyalty_transactions` — loyalty ledger.
- `notifications` — in-app notifications.
- `notification_preferences` — per-user notification preferences.
- `push_tokens` — mobile/web push tokens.
- `files` — file metadata storage references.

#### Invoicing and e-invoice

- `invoices` — invoice headers.
- `invoice_items` — invoice line items.
- `e_invoice_requests` — Malaysia e-invoice submission payloads/status.

#### Platform administration and templates

- `platform_config` — runtime platform config key-values.
- `plans` — platform subscription plans.
- `feature_flags` — global feature flag definitions.
- `feature_flag_overrides` — per-tenant feature overrides.
- `audit_logs` — admin/platform action trail.
- `announcements` — platform announcement messages.
- `email_templates` — template storage.
- `api_keys` — API key hashes and scopes.
- `tenant_templates` — tenant template master records.
- `tenant_template_versions` — template versions.
- `tenant_template_assignments` — active template assignment per tenant.
- `tenant_ui_overrides` — per-tenant UI override JSON.

#### Additional production tables (legacy/compatibility paths)

- `blocked_times` — legacy scheduling block model.
- `broadcasts` — tenant broadcast/feed posts.
- `class_enrollments` — member enrollments in classes.
- `client_coach_history` — historical coach-client mapping.
- `collection_logs` — collection/payment verification history.
- `commission_rules` — commission rule configuration.
- `custom_forms` — tenant custom form definitions.
- `expenses` — expense ledger.
- `form_submissions` — submitted form entries.
- `group_classes` — class session definitions.
- `invite_codes` — invitation code issuance/lookup.
- `join_requests` — pending membership join workflow.
- `notification_log` — legacy notification send log.
- `notification_templates` — tenant notification template records.
- `package_combos` — package bundle constructs.
- `payment_transactions` — legacy payment transaction table.
- `platform_plans` — legacy platform plan table.
- `referrals` — referral program tracking.
- `service_catalog` — alternate service catalog used by booking fallback queries.
- `service_reviews` — customer service ratings/reviews.
- `staff_attendance` — staff attendance logs.
- `staff_commissions` — commission payout records.
- `staff_schedules` — staff schedule roster.
- `store_credits` — customer store credit balances/entries.
- `tips` — tip records.

### Key relationships

- Auth identity chain: `user.id` (Better Auth) → `users.auth_id` (app user).
- Tenancy: `tenant_memberships.user_id` ↔ `users.id`, `tenant_memberships.tenant_id` ↔ `tenants.id`.
- Commercial flow: `orders` → `order_items`; `payments` can reference `orders`/`bookings`.
- Membership flow: `memberships` → `subscriptions` → member access/check-ins.
- Access flow: `tenant_memberships.member_id` + tenant secret → QR (`member_qr_codes`) → gate verification.
- Invoicing flow: `pos_transactions` ↔ `e_invoice_requests`; `invoices` ↔ `invoice_items`.
- Template flow: `tenant_templates` → `tenant_template_versions` → `tenant_template_assignments`.

### RLS policies

Timeo uses tenant-scoped RLS with `app.current_tenant` context and the `tenant_isolation` policy:

`tenant_id = current_setting('app.current_tenant', true)`

Observed RLS-enabled tables in production:

- `blocked_slots`, `booking_events`, `bookings`, `business_hours`, `check_ins`
- `e_invoice_requests`, `gift_card_transactions`, `gift_cards`, `member_qr_codes`
- `memberships`, `notification_preferences`, `notifications`, `orders`, `payments`
- `pos_transactions`, `products`, `services`, `session_credits`, `session_logs`, `session_packages`
- `staff_availability`, `stripe_accounts`, `subscriptions`, `voucher_redemptions`, `vouchers`

### Migration system

- Drizzle migration files live in `packages/db/drizzle/`.
- Current sequence includes `0000`..`0010` migration files.
- CLI scripts: `pnpm --filter @timeo/db db:generate` and `pnpm --filter @timeo/db db:migrate`.

## 4) Authentication

- Auth framework: Better Auth (`packages/auth/src/server.ts`).
- Credential provider enabled with email/password and email verification required.
- Auth tables: `user`, `account`, `session`, `verification`.
- App profile table: `users`, linked by `users.auth_id -> user.id`.
- Trusted origins are assembled from env + fixed values and include:
  - `SITE_URL`, `API_URL`, `APP_URL`, `MARKETING_URL`
  - `https://app.timeo.my`, `https://timeo.my`
  - localhost origins (`3000`, `3001`, `4000`)
- Production auth cookies are configured for cross-subdomain `.timeo.my`.
- Password hashing: Better Auth credential hashes generated via `better-auth/crypto` (scrypt-based hash format in `account.password`).

## 5) Multi-Tenancy

- Tenant model is centered on `tenants` + `tenant_memberships`.
- Role model includes: `platform_admin`, `admin`, `staff`, `coach`, `customer`.
- Isolation layers:
  - API tenant middleware validates active membership or platform admin override.
  - Middleware sets `app.current_tenant` for DB-session tenant context.
  - RLS policy enforces tenant row access on tenant-scoped tables.
- Template system:
  - Data model: `tenant_templates`, `tenant_template_versions`, `tenant_template_assignments`, `tenant_ui_overrides`.
  - Functional reference: `docs/TENANT_TEMPLATES.md`.

## 6) Key Features

- Membership management — plans/subscriptions via `memberships`, `subscriptions`, `tenant_memberships`.
- Payment requests (DuitNow/manual receipts) — `payment_requests` flow and admin approve/reject routes.
- POS system — `pos_transactions` and POS API routes.
- Class scheduling & enrollment — scheduling routes + legacy `group_classes`/`class_enrollments` reads.
- Session packages/credits — `session_packages`, `session_credits`, `session_logs`.
- Coach management — coach availability/bookings/notes and coach routes.
- Check-in system — check-in APIs + feed/history (`check_ins`).
- Turnstile/gate access — gate verification routes + device/face/access tables.
- E-invoice — `e_invoice_requests` and invoice routes.
- Member QR codes — permanent TM-format QR generation/verification.
- Loyalty points — `loyalty_points` and `loyalty_transactions`.
- Notifications — in-app + push tables, email delivery via SMTP (Brevo defaults in auth mailer).
- File uploads — file metadata records plus upload flows used by gym/payment features.
- Bookings — end-to-end booking CRUD + booking events.

## 7) Environment Variables (redacted)

### API (required at runtime)

- `DATABASE_URL=postgresql://timeo:<redacted>@<host>:5432/timeo`
- `REDIS_URL=redis://:<redacted>@<host>:6379`
- `BETTER_AUTH_SECRET=<redacted_min_32_chars>`
- `JWT_SECRET=<redacted_min_32_chars>`
- `SITE_URL=https://app.timeo.my`
- `API_URL=https://api.timeo.my`

### API (feature-specific / optional depending on enabled modules)

- `ALLOWED_ORIGINS=<comma-separated-origins>`
- `STRIPE_SECRET_KEY=<redacted>`
- `STRIPE_WEBHOOK_SECRET=<redacted>`
- `REVENUE_MONSTER_CLIENT_ID=<redacted>`
- `REVENUE_MONSTER_CLIENT_SECRET=<redacted>`
- `REVENUE_MONSTER_PRIVATE_KEY_PATH=<path>`
- `REVENUE_MONSTER_PUBLIC_KEY_PATH=<path>`
- `REVENUE_MONSTER_STORE_ID=<redacted>`
- `REVENUE_MONSTER_ENVIRONMENT=production|sandbox`
- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`
- `SMTP_USER=<redacted>`
- `SMTP_PASS=<redacted>`
- `EMAIL_FROM=noreply@timeo.my`
- `MQTT_BROKER_URL=<mqtt-url>`
- `MQTT_USERNAME=<redacted>`
- `MQTT_PASSWORD=<redacted>`
- `MQTT_TOPIC_PREFIX=topic/face/manage`
- `GYM_DEVICE_KEY_SECRET=<redacted>`
- `QR_TOKEN_SECRET=<redacted_or_default>`
- `APPLE_TEAM_ID=<redacted>`
- `APPLE_PASS_TYPE_ID=<redacted>`
- `APPLE_NFC_PUBLIC_KEY=<redacted>`
- `GOOGLE_WALLET_ISSUER_ID=<redacted>`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=<redacted>`
- `TIMEO_AVATAR_STORAGE_DIR=<path>`
- `TIMEO_AVATAR_PUBLIC_BASE_URL=<url>`
- `TIMEO_RECEIPT_STORAGE_DIR=<path>`
- `TIMEO_RECEIPT_PUBLIC_BASE_URL=<url>`

### Web (required/recommended)

- `NEXT_PUBLIC_API_URL=https://api.timeo.my`
- `NEXT_PUBLIC_SITE_URL=https://app.timeo.my` (or `NEXT_PUBLIC_APP_URL`)
- `INTERNAL_API_URL=http://timeo-api:4000` (server-side rewrite target in containerized deploy)

### Web (feature-specific)

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<redacted>`
- `NEXT_PUBLIC_POSTHOG_KEY=<redacted>`
- `NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com`
- `NEXT_PUBLIC_PAYLOAD_URL=<cms-url>`

## 8) Deployment Guide

### Normal deploy path

- Push code to the tracked branch/repo.
- Dokploy builds and rolls services in Swarm (as configured in Dokploy project).
- Alternate/manual path exists in repo (`docker-compose.prod.yml`, GitHub workflows), but production runtime is currently Swarm services under Dokploy.

### Migrations

- Local/CI style:
  - `pnpm --filter @timeo/db db:generate`
  - `pnpm --filter @timeo/db db:migrate`
- With explicit DB URL:
  - `DATABASE_URL=postgresql://timeo:<redacted>@<host>:5432/timeo pnpm --filter @timeo/db db:migrate`

### Access production DB

```bash
ssh root@72.61.123.64
PG=$(docker ps --format "{{.Names}}" | grep timeo-postgres | head -n1)
docker exec -i "$PG" psql -U timeo -d timeo
```

### Restart services

```bash
ssh root@72.61.123.64
docker service ls
docker service update --force timeo-api-ntlib8
docker service update --force timeo-web-cnyu9o
```

### Check logs

```bash
ssh root@72.61.123.64
docker service logs -f timeo-api-ntlib8
docker service logs -f timeo-web-cnyu9o
```

## 9) WS Fitness Specific

- Tenant ID: `7Kw87VeAnXg4qDXi6UTbu`.
- Migration baseline: 415 migrated memberships from OnePros legacy source (`docs/MIGRATION_WS_FITNESS.md`).
- Turnstile device IP: `192.168.1.201` (LAN endpoint referenced in migration runbook).
- Gym PC/Tailscale host used in runbooks: `100.85.207.121`.
- Gate controller code in repo: `turnstile-sync-agent/gate-controller-v3.js`.
- Operational external path note (gym PC): `C:\TimeoGate\gate-controller.js`.
- Kiosk token (tenant setting): `L8OUGRTI1NXJJLXER30JU`.

Current data notes after production remediation:

- Backfilled 42 migrated WS memberships where `member_id` was missing (`member_id = external_id`).
- Generated/updated permanent member QR rows for all 415 migrated WS memberships.

## 10) Disaster Recovery

- Source repository: `https://github.com/timeomy/Timeo`.

### Backup strategy (what exists)

- Repo includes backup/restore scripts:
  - `infra/scripts/backup.sh`
  - `infra/scripts/restore.sh`
- `docker-compose.prod.yml` defines an optional `backup` profile/service and optional S3 upload target.
- In current Swarm service list, no always-on backup service is running by default.

### Recommended minimum backup posture

- Schedule daily `pg_dump` backups with retention and off-host copy (S3/object storage).
- Test restore monthly into a disposable DB using `infra/scripts/restore.sh`.
- Keep at least one encrypted offsite weekly snapshot.

### Rebuild from scratch (high-level)

1. Clone repository and create env file from `.env.example`.
2. Provision PostgreSQL and Redis.
3. Set required API/web env vars (Section 7).
4. Run DB migrations from `packages/db/drizzle/`.
5. Seed required baseline data (`seed`, template seed if needed).
6. Build/deploy API and web to Dokploy/Swarm.
7. Verify health endpoints, auth, tenant access, and billing/check-in critical flows.

### Critical accounts

- `jabez@oxloz.com` is currently a `platform_admin` in production.
