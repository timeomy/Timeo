# CLAUDE.md — Timeo Project Instructions

> This file lives at the root of the Timeo monorepo. Claude Code reads it automatically.

---

## Project Overview

This is a TypeScript monorepo (pnpm workspace) called Timeo with: Hono API server, Next.js web apps, Expo mobile apps (4 role-based), Drizzle ORM database package, TanStack Query api-client package, and Better Auth. Always use the correct import path aliases for each package — verify aliases in tsconfig.json before importing.

You are helping me build **Timeo** (timeo.my), an all-in-one business operating system for service-based and retail businesses in Southeast Asia. It is a white-label, multi-tenant SaaS platform targeting gyms, cafes, salons, clinics, and retail stores — combining POS, ERP, CRM, SCM, appointment scheduling, and analytics capabilities (similar to China's Pospal).

**Target market:** Malaysia first, then expand to Singapore, Thailand, Indonesia, Philippines.
**Business model:** Subscription-based (tenants pay monthly), with transaction fees on payment processing.
**Currency:** MYR at launch, multi-currency later.

### Timeo C2 — Platform Control Center
Timeo includes a **C2 (Command & Control) dashboard** — a unified admin UI at `apps/web/app/(platform)/` where Platform IT manages the entire ecosystem from one interface. Everything that exists in Timeo is viewable, configurable, and controllable from C2 — tenants, users, billing, features, config, health, analytics, emails, integrations, and data. No SSH, no manual DB edits, no .env changes for runtime config. See `specs/phase-1/c2-platform-control-center.md` for the full spec.

**C2 Modules:** Command Dashboard, Tenant Management, User Management, Subscription & Billing, Feature Flags, Platform Configuration, Analytics & Reports, Activity & Audit Log, System Health, Communication Center, API & Integrations, Data Management.

**Key pattern:** Runtime config is stored in `platform_config` table (not .env) so it can be changed from C2 UI. Only infrastructure secrets (DATABASE_URL, REDIS_URL, RM_PRIVATE_KEY) stay in .env.

---

## Before Starting Work

When implementing from a task spec or team-lead assignment, read the FULL spec carefully before starting. Cross-reference field names, function signatures, and return types against the actual codebase — never assume stale types are correct.

---

## Development Methodology: Spec-Driven Development (SDD)

Every feature follows this exact sequence:

```
1. SPEC → 2. REVIEW → 3. TEST → 4. IMPLEMENT → 5. VERIFY
```

### Rules:
- **New feature?** → Write spec to `specs/phase-X/feature-name.md` first. Present for approval. No code until approved.
- **"Just build it"?** → Still write a lightweight spec (Overview + Acceptance Criteria + API Contract + Test Plan). Confirm before implementing.
- **Bug fix?** → No spec needed. Write a regression test that fails, then fix.
- **Spec template** is at `specs/_template.md`. Copy it for new features.

### Spec must include:
- Status, Priority, Phase
- User Stories
- Acceptance Criteria (testable checkboxes)
- API Contract (endpoints, request/response shapes, auth, tenant-scoped)
- Database Changes (tables, columns, RLS policies, migration)
- UI/UX (web pages, mobile screens, components)
- Technical Approach
- Edge Cases & Error Handling
- Security Considerations
- Test Plan (unit, integration, E2E)
- Files to Create/Modify

---

## Tech Stack

### Backend
- **Runtime:** Node.js (or Bun)
- **Database:** PostgreSQL with **Drizzle ORM**
- **API Layer:** **Hono** (lightweight, ultrafast)
- **Real-time:** Socket.io
- **Caching / Queues / Sessions:** **Redis**
- **File Storage:** Local VPS or S3-compatible (MinIO / Cloudflare R2)
- **Testing:** Vitest (unit + integration), Playwright (E2E)

### Authentication
- **Better Auth** (open source, self-hosted, database-backed)
- Email/password + Google OAuth + extensible for phone OTP
- Sessions in PostgreSQL (Redis-cached)
- Multi-tenant aware — users belong to multiple tenants with different roles

### Email
- **Nodemailer** with SMTP (Brevo free tier: 300 emails/day at launch)
- Plugged into Better Auth's `sendVerificationEmail` and `sendResetPassword` hooks
- Upgrade path: Amazon SES or useSend when volume grows

### Payment Gateway
- **Revenue Monster** (Malaysian fintech, RESTful API + Node.js SDK `rm-api-sdk`)
- FPX, Visa/Mastercard, eWallets (TNG, Boost, GrabPay, ShopeePay), DuitNow QR
- Also provides: loyalty API, eVoucher system, smart POS terminal
- Sandbox: `sb-oauth.revenuemonster.my` / `sb-open.revenuemonster.my`
- **No recurring billing** — handle tenant subscriptions via manual FPX invoicing

### Frontend — Web
- **Next.js** (App Router) with TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Data Fetching:** Tanstack Query (React Query)
- **Forms:** React Hook Form + Zod resolver

### Frontend — Mobile
- **Expo** (managed workflow) with React Native
- **Navigation:** Expo Router
- **Data Fetching:** Tanstack Query → same Hono API
- **Offline POS:** MMKV/SQLite local queue + sync

### Deployment
- **Dokploy** (self-hosted VPS)
- Docker containers: PostgreSQL, Redis, Hono API, Next.js
- Traefik reverse proxy, wildcard SSL (`*.timeo.my`)
- **Minimum VPS:** 2 vCPU, 4 GB RAM, 80 GB SSD

### DevOps
- **Monorepo:** Turborepo + pnpm
- **Validation:** Zod (shared across all apps)
- **Migrations:** Drizzle Kit
- **CI/CD:** GitHub Actions → Dokploy webhook
- **Monitoring:** Uptime Kuma + Grafana (self-hosted)

---

## Architecture

### Multi-Tenancy
- Shared database, shared schema, `tenant_id` on all tenant-scoped tables
- PostgreSQL **Row-Level Security (RLS)** policies enforce isolation
- `tenant_id` propagated via `SET app.current_tenant` for RLS
- `tenants` table stores metadata, branding, plan, custom domain

### User Roles
1. **Customer** — books appointments, makes purchases, earns loyalty
2. **Staff** — cashier, therapist, trainer
3. **Business Admin** — manages staff, inventory, settings
4. **Platform IT** — manages entire Timeo platform, onboards tenants

### Database Schema

```
-- Platform
tenants, tenant_subscriptions

-- Auth (Better Auth)
users, sessions, accounts, verifications

-- Multi-tenant mapping
tenant_members (tenant_id, user_id, role, status)

-- Products & Services
products, services, service_staff

-- Appointments
appointments

-- Orders & POS
orders, order_items, payments

-- Inventory
inventory, stock_movements

-- CRM
customers, customer_visits

-- Staff
staff_profiles

-- Loyalty
loyalty_rules, loyalty_transactions

-- C2 Control Center
platform_config (section, key, value JSONB — runtime config, replaces .env for non-secrets)
feature_flags (key, name, default_enabled, phase)
feature_flag_overrides (feature_flag_id, tenant_id, enabled)
audit_log (actor_id, actor_role, tenant_id, action, resource_type, details JSONB, ip_address)
announcements (title, body, type, target, active, expires_at)
email_templates (key, subject, body_html, variables JSONB)
api_keys (tenant_id nullable, name, key_hash, permissions JSONB, expires_at)
plans (name, slug, price_cents, interval, features JSONB, limits JSONB)
```

All tenant-scoped tables have `tenant_id` + RLS policies.

### API Structure

```
apps/api/src/
├── routes/          (auth, tenants, members, products, services, appointments,
│                     orders, payments, inventory, customers, staff, loyalty,
│                     analytics, webhooks, platform)
├── middleware/       (auth.ts, tenant.ts, rbac.ts, rate-limit.ts, error-handler.ts)
├── db/schema/       (one file per domain)
├── db/migrations/
├── db/seed.ts
├── lib/             (better-auth.ts, redis.ts, revenue-monster.ts, realtime.ts,
│                     storage.ts, email.ts)
├── types/
└── index.ts
```

### Monorepo Structure

```
timeo/
├── CLAUDE.md           ← this file
├── specs/              ← SDD feature specs (source of truth)
│   ├── _template.md
│   ├── phase-1/
│   ├── phase-2/
│   ├── phase-3/
│   ├── phase-4/
│   └── phase-5/
├── apps/
│   ├── web/            ← Next.js App Router
│   │   ├── app/(auth)/
│   │   ├── app/(dashboard)/
│   │   ├── app/(platform)/   ← super admin panel
│   │   └── e2e/
│   ├── mobile/         ← Expo React Native
│   │   └── app/
│   └── api/            ← Hono backend
│       └── tests/
├── packages/
│   ├── db/             ← Drizzle schema, migrations, RLS
│   ├── auth/           ← Better Auth config
│   ├── shared/         ← Zod schemas, types, API client
│   ├── ui/             ← shadcn/ui components
│   └── payments/       ← Revenue Monster wrapper
├── turbo.json
├── pnpm-workspace.yaml
└── .github/workflows/
```

### Test Structure

```
apps/web/e2e/           ← Playwright E2E tests (*.spec.ts)
apps/api/tests/
├── integration/        ← Vitest + test DB (*.test.ts)
└── unit/               ← pure logic tests (*.test.ts)
packages/shared/tests/  ← schema/utility tests
```

---

## Payment Flow (Revenue Monster)

1. Web/Mobile creates order → Hono API
2. API creates RM payment transaction
3. Customer redirected to RM payment page (or QR scan)
4. RM webhook → `/api/webhooks/revenue-monster`
5. API verifies signature, updates order/payment, emits Socket.io
6. Web/Mobile shows receipt

```typescript
// lib/revenue-monster.ts usage pattern
const payment = await rm.Payment.createWebPayment(accessToken, {
  order: { id: orderId, title: 'Order #1234', amount: 5000, currencyType: 'MYR' },
  storeId: tenantStoreId,
  redirectUrl: `${baseUrl}/payment/callback`,
  notifyUrl: `${baseUrl}/api/webhooks/revenue-monster`,
});
```

---

## Coding Conventions

- **TypeScript strict mode** everywhere
- **Zod** for all validation (shared via `@timeo/shared`)
- **Drizzle ORM** — no raw SQL unless necessary (RLS setup, CTEs)
- **Functional style** — pure functions, avoid classes
- **Error handling** — typed responses, never expose stack traces
- **Naming:**
  - `camelCase` — variables, functions
  - `PascalCase` — components, types, interfaces
  - `snake_case` — database columns, table names
  - `SCREAMING_SNAKE_CASE` — env vars, constants
- **File naming:** `kebab-case` (e.g., `order-items.ts`)
- **Imports:** path aliases (`@/`, `@timeo/shared`, `@timeo/db`, `@timeo/payments`)
- **API envelope:**
  ```typescript
  type ApiResponse<T> = 
    | { success: true; data: T }
    | { success: false; error: { code: string; message: string } };
  ```
- **Dates:** `timestamptz` in DB, ISO 8601 in API, `dayjs` for manipulation
- **Money:** store in **cents** (integer). RM50.00 = `5000`
- **IDs:** `cuid2` or `nanoid` for public-facing, serial for internal PKs
- **Tests:** `*.test.ts` for unit/integration, `*.spec.ts` for E2E

---

## Quality Gates

Always run `pnpm typecheck` (or equivalent) after making code changes and fix all errors before reporting task completion. Zero type errors is the standard.

---

## Key Principles

1. **Spec first, code second** — no feature without an approved spec
2. **Tests before implementation** — write failing tests from acceptance criteria, then implement
3. **Tenant isolation is non-negotiable** — every query scoped by `tenant_id` via RLS. Never trust client `tenant_id`
4. **Mobile-first** — POS and appointments must work on phones/tablets
5. **Offline-capable POS** — MMKV queue + background sync, server wins on conflict
6. **Incremental rollout** — POS + appointments first, then CRM, inventory, analytics
7. **White-label ready** — branding in `tenants.branding` JSONB
8. **Cost-conscious** — self-hosted, open source, ~RM50-100/month infra
9. **SEA-localized** — Malay + English, RM currency, local payment methods

---

## Current State

### Completed (Migration from Convex)
- [x] Monorepo (Turborepo + pnpm)
- [x] Convex → Hono + PostgreSQL + Drizzle (14,188 lines removed)
- [x] Better Auth (email/password + Google OAuth)
- [x] 40+ mobile screens → Tanstack Query
- [x] 55 web pages → Tanstack Query + @timeo/api-client
- [x] CI/CD on every PR + push
- [x] EAS build (dev/preview/production)
- [x] Convex fully deleted, 0 Convex imports remaining

### Phase 1 — Remaining
- [ ] RLS policies for all tenant-scoped tables
- [ ] Revenue Monster sandbox integration
- [ ] E2E tests passing against Hono backend
- [ ] Deploy to Dokploy (production)
- [ ] **C2 Platform Control Center** (see `specs/phase-1/c2-platform-control-center.md`)
  - [ ] New tables: platform_config, feature_flags, feature_flag_overrides, audit_log, announcements, email_templates, api_keys, plans
  - [ ] C2 API routes: /api/platform/*
  - [ ] C2 UI: 12 modules (dashboard, tenants, users, billing, features, config, analytics, activity, health, comms, integrations, data)

### Phase 2 — Core POS
- [ ] Product catalog CRUD
- [ ] POS order flow
- [ ] Revenue Monster payment integration
- [ ] Receipt generation
- [ ] POS mobile/tablet interface

### Phase 3 — Appointments & Services
### Phase 4 — CRM & Inventory
### Phase 5 — Analytics & Polish

---

## Workflow Rules

When a task is already completed, confirm it's done and do not redo work. If a duplicate task assignment arrives, respond with the status of the original completion.

---

## CI/CD

After creating or editing CI workflow files (GitHub Actions), verify: correct action versions, all required flags/reporters, and artifact paths match the spec exactly before reporting completion.

---

## Agent Instructions

### When working on tasks:
1. Read this file first
2. Check `specs/` for existing specs related to the task
3. Follow SDD: spec → review → test → implement → verify
4. Run `pnpm typecheck` after changes
5. Run relevant tests after implementation
6. Commit with conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`

### Multi-agent workflow:
When spawning sub-agents, assign clear roles:
- **routes-agent** — API routes + middleware
- **db-agent** — Drizzle schema + migrations + RLS
- **web-agent** — Next.js pages + components
- **mobile-agent** — Expo screens + components
- **test-agent** — E2E + integration + unit tests
- **ci-agent** — GitHub Actions, deploy config

### Implementation order for any feature:
1. Database schema (Drizzle) + migration + RLS
2. Zod schemas in `@timeo/shared`
3. API routes (Hono) + middleware
4. Web UI (Next.js)
5. Mobile UI (Expo)
6. Real-time (Socket.io) if applicable
7. Tests

### Never:
- Write code before spec is approved (unless bug fix)
- Use `any` type
- Use raw SQL when Drizzle works
- Skip error handling or tests
- Hardcode tenant-specific values
- Expose internal IDs or stack traces
- Skip RLS on tenant-scoped tables

---

## Platform Admin & User Flow Architecture

### Platform Admin
- **Jabez (jabez@oxloz.com)** is the platform admin for Timeo
- Jabez has access to the **C2 (Command & Control) UI** — the platform admin dashboard
- From C2, Jabez can **onboard and offboard businesses** (tenants) on Timeo

### Business Onboarding Flow (via C2)
1. Platform admin enrolls a new business in C2 (e.g., "WS Fitness")
2. System **auto-sends a login email** to the specified business admin email address
3. Email includes a **temporary password**
4. Business admin logs in and is **required to reset the temp password** on first login
5. Business admin then accesses the **Business Admin UI** (dashboard, staff, inventory, POS, etc.)

### Sign-Up on timeo.my (Public)
- The **sign-up feature on timeo.my is for normal users / clients only**
- When a customer signs up and logs in, they see the **regular Customer UI** only
- Customers can book appointments, make purchases, earn loyalty points, etc.

### Business Login
- Add a **"Business Login" link at the bottom of timeo.my** for businesses to log in
- Business login leads to a **different UI** (Business Admin dashboard) — not the customer UI
- This keeps customer and business flows clearly separated
