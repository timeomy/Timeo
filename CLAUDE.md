# Timeo

Multi-tenant SaaS platform for bookings and commerce operations. Malaysian market (MYR), domain: **Timeo.my**.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript (web)
- **Mobile**: Expo SDK 55 + React Native 0.83 + React 19 + expo-router
- **Database**: PostgreSQL 16 + Drizzle ORM — `packages/db/`
- **API Server**: Hono (Node.js) — `packages/api/src/`
- **Cache/PubSub**: Redis 7 + Socket.io (real-time) + BullMQ (jobs)
- **Auth**: Better Auth with Drizzle adapter (`packages/auth/`)
- **Data Fetching**: TanStack Query v5 (`packages/api-client/`)
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI (web) / NativeWind 4.2 (mobile)
- **Animations**: Framer Motion (web) / Reanimated 4 (mobile)
- **Payments**: Revenue Monster (FPX, eWallets, DuitNow QR) + Stripe (subscriptions fallback)
- **Notifications**: Novu (`packages/notifications/`)
- **CMS**: Payload CMS (`packages/cms/`) — tenant websites
- **Analytics**: PostHog (`packages/analytics/`)
- **e-Invoice**: MyInvois / LHDN (Malaysia) — `packages/db/src/schema/einvoice.ts`
- **Icons**: Lucide React / lucide-react-native
- **Package Manager**: pnpm 9 + Turborepo 2

## Monorepo Structure

```
apps/
  web/            # Next.js 14 — tenant dashboard, storefront, admin
  mobile/         # Expo — consolidated app (customer + staff + admin + platform)

packages/
  db/             # PostgreSQL schema (Drizzle), migrations, RLS, seed
  api/            # Hono API server — routes, services, middleware, jobs, realtime
  auth/           # Better Auth (Drizzle adapter, web proxy, mobile JWT)
  api-client/     # TanStack Query hooks, Socket.io client
  ui/             # Shared UI components (web + mobile)
  shared/         # Types, enums, constants, utilities
  payments/       # Stripe helpers
  notifications/  # Novu SDK integration
  cms/            # Payload CMS
  analytics/      # PostHog event tracking

infra/
  api/            # Hono API Dockerfile (multi-stage Node 20 Alpine)
  web/            # Next.js Dockerfile (standalone build)
  postgres/       # init.sql (RLS helper functions)
  migration/      # Convex → PostgreSQL data migration scripts
  scripts/        # backup.sh, restore.sh, generate-secrets.sh
  cron/           # backup.cron (daily 2 AM)
```

## Web App Routes (`apps/web/`)

- `app/(app)/` — Authenticated routes (tenant dashboard, onboarding)
- `app/(marketing)/` — Public landing page
- `app/(store)/` — Public storefront (booking, orders, membership)
- `app/api/auth/[...all]/` — Auth proxy → Hono API (Better Auth)
- `app/api/` — Webhooks (Stripe, Revenue Monster)

## Key Patterns

- **Multi-tenancy**: Shared DB + `tenant_id` + PostgreSQL RLS via `SET app.current_tenant`. Helper: `withTenantContext(db, tenantId, fn)` in `packages/db/src/rls.ts`
- **Auth**: Better Auth with Drizzle adapter → PostgreSQL. Web: cookie sessions proxied through Next.js `/api/auth/*` → Hono API. Mobile: JWT tokens
- **RBAC**: Role hierarchy (`platform_admin > admin > staff > customer`) — enforced in Hono middleware
- **API response envelope**: `{ success: true, data }` | `{ success: false, error: { code, message } }`
- **Money**: Integer cents (RM50.00 = 5000). Currency: MYR
- **IDs**: nanoid(21) as text primary keys
- **Timestamps**: `timestamptz` (PostgreSQL), ISO strings in API responses
- **Real-time**: Socket.io rooms (`tenant:<id>`, `user:<id>`) + Redis adapter. TanStack Query auto-invalidation via `useRealtimeInvalidation`
- **Background jobs**: BullMQ — auto-cancel no-shows, send booking reminders
- **Booking engine**: Services, bookings, staff availability, blocked slots, business hours
- **Commerce**: Products, orders, POS transactions, vouchers, gift cards
- **Fitness vertical**: Check-ins (QR/NFC/manual), session packages & credits, session logs
- **Payments**: Revenue Monster (FPX/eWallets) for online, POS for in-person (cash/card/QR pay/bank transfer), Stripe for subscriptions
- **Components**: shadcn/ui style with CVA variants (web) / NativeWind components (mobile)
- **Audit logs**: All mutations tracked in `audit_logs` table

## Database Schema (key tables)

34 tables across 9 schema files in `packages/db/src/schema/`:

`users`, `tenants`, `tenant_memberships`, `services`, `bookings`, `booking_events`, `products`, `orders`, `order_items`, `memberships`, `payments`, `subscriptions`, `stripe_accounts`, `pos_transactions`, `check_ins`, `member_qr_codes`, `session_packages`, `session_credits`, `session_logs`, `vouchers`, `voucher_redemptions`, `gift_cards`, `gift_card_transactions`, `notifications`, `notification_preferences`, `push_tokens`, `staff_availability`, `business_hours`, `blocked_slots`, `e_invoice_requests`, `files`, `feature_flags`, `audit_logs`, `platform_config`

Better Auth tables (managed by Better Auth): `user`, `session`, `account`, `verification`

## Commands

```bash
# Root (Turborepo)
pnpm dev           # Start all apps in dev mode
pnpm build         # Build all packages
pnpm lint          # Lint all packages
pnpm typecheck     # Type-check all packages
pnpm test          # Run all tests
pnpm clean         # Clean build artifacts + node_modules

# Database
pnpm --filter @timeo/db exec drizzle-kit generate  # Generate migration from schema changes
pnpm --filter @timeo/db exec drizzle-kit migrate   # Run pending migrations
pnpm --filter @timeo/db exec drizzle-kit studio    # Open Drizzle Studio GUI
pnpm --filter @timeo/db seed                       # Seed dev data

# API server
pnpm --filter @timeo/api dev       # Start Hono dev server on :4000 (tsx watch)
pnpm --filter @timeo/api build     # Build API (tsc → dist/)
pnpm --filter @timeo/api test      # Run Vitest integration tests

# Web app
pnpm --filter @timeo/web dev       # Next.js dev server on :3000
pnpm --filter @timeo/web build     # Build web app

# Mobile (consolidated app)
pnpm --filter @timeo/mobile ios     # Run on iOS simulator
pnpm --filter @timeo/mobile android # Run on Android emulator

# Docker (local dev)
docker compose up -d                              # Start postgres + redis
docker compose --profile migrate up migrate       # Run DB migrations
docker compose --profile services up -d           # Start all services in containers

# Docker (production)
docker compose -f docker-compose.prod.yml up -d   # Start production stack
```

## Deployment

- **Web** (`apps/web`): Dokploy on self-hosted VPS — `https://timeo.my`
- **API** (`packages/api`): Dokploy on self-hosted VPS — `https://api.timeo.my`
- **Mobile** (`apps/mobile`): EAS Build (Expo Application Services) — single consolidated app
- **Auto-deploy**: `git push origin main` triggers GitHub Actions → Dokploy webhooks

## Environment Variables

Key vars (see `.env.example` at project root):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `BETTER_AUTH_SECRET` — Auth secret (min 32 chars, must match API + web)
- `JWT_SECRET` — JWT signing secret (min 32 chars)
- `SITE_URL` — Web app URL (`https://timeo.my`)
- `API_URL` — API URL (`https://api.timeo.my`)
- `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` — Client-side API URL
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `REVENUE_MONSTER_CLIENT_ID`, `REVENUE_MONSTER_CLIENT_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`

## Skills Reference

### Core Development
- `/shadcn-ui` — Component discovery, installation, customization
- `/review-react-best-practices` — React/Next.js performance & reliability review
- `/workflow-feature-shipper` — Ship PR-sized features end-to-end
- `/tool-systematic-debugging` — Structured debugging methodology
- `/tool-better-auth` — Better Auth implementation patterns

### Quality & Review
- `/review-quality` — Unified quality review (code + docs + merge readiness)
- `/review-merge-readiness` — Structured PR review before merges
- `/review-clean-code` — Code smell detection and refactoring
- `/review-doc-consistency` — Documentation vs code alignment

### Design & UX
- `/tool-design-style-selector` — Define visual direction and design tokens
- `/tool-ui-ux-pro-max` — UI/UX design intelligence
- `/enhance-prompt` — Turn vague UI ideas into detailed prompts

### Workflow & Planning
- `/workflow-ship-faster` — End-to-end ship workflow (idea to deploy)
- `/workflow-brainstorm` — Idea to confirmed design spec
- `/workflow-project-intake` — Requirements clarification and routing

### SEO (public store/marketing pages)
- `/review-seo-audit` — Technical SEO audit
- `/tool-schema-markup` — Structured data / JSON-LD

### Payments
- `/stripe` — Payment processing, subscriptions, Connect
