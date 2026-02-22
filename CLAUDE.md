# Timeo

Multi-tenant SaaS platform for bookings and commerce operations. Malaysian market (MYR), domain: **Timeo.my**.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript (web)
- **Mobile**: Expo SDK 55 + React Native 0.83 + React 19 + expo-router
- **Backend/DB**: Convex (real-time, serverless) — `packages/api/convex/`
- **Auth**: Better Auth (`packages/auth/`) via `@convex-dev/better-auth`
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI (web) / NativeWind 4.2 (mobile)
- **Animations**: Framer Motion (web) / Reanimated 4 (mobile)
- **Payments**: Stripe (Connect, subscriptions, POS)
- **Notifications**: Novu (`packages/notifications/`)
- **CMS**: Payload CMS (`packages/cms/`) — tenant websites
- **Analytics**: PostHog (`packages/analytics/`)
- **e-Invoice**: MyInvois / LHDN (Malaysia) — schema in Convex
- **Icons**: Lucide React / lucide-react-native
- **Package Manager**: pnpm 9 + Turborepo 2

## Monorepo Structure

```
apps/
  web/          # Next.js 14 — tenant dashboard, storefront, admin
  customer/     # Expo — customer booking & commerce app
  staff/        # Expo — staff scheduling & check-in app
  admin/        # Expo — tenant admin app
  platform/     # Expo — platform super-admin app

packages/
  api/          # Convex backend (schema, mutations, queries, actions, crons)
  auth/         # Better Auth (providers, RBAC, session, guards)
  ui/           # Shared UI components (web + mobile)
  shared/       # Types, enums, constants, utilities
  payments/     # Stripe helpers
  notifications/# Novu SDK integration
  cms/          # Payload CMS
  analytics/    # PostHog event tracking
```

## Web App Routes (`apps/web/`)

- `app/(app)/` — Authenticated routes (tenant dashboard, onboarding)
- `app/(marketing)/` — Public landing page
- `app/(store)/` — Public storefront (booking, orders, membership)
- `app/api/` — API routes and webhooks

## Key Patterns

- **Multi-tenancy**: Tenant-scoped data via `tenantId`, slug-based routing (`[tenantSlug]`)
- **RBAC**: Role hierarchy (`platform_admin > admin > staff > customer`) — `packages/api/convex/lib/rbac.ts`
- **Tenant guards**: `withTenantGuard` wrapper — `packages/api/convex/lib/guards.ts`
- **Booking engine**: Native Convex (services, bookings, staff availability, blocked slots)
- **Commerce**: Native Convex (products, orders, POS transactions, vouchers, gift cards)
- **Fitness vertical**: Check-ins (QR/NFC/manual), session packages & credits, session logs, membership subscriptions
- **Payments**: Stripe PaymentIntents for online, POS for in-person (cash/card/QR pay/bank transfer)
- **Components**: shadcn/ui style with CVA variants (web) / NativeWind components (mobile)
- **Audit logs**: All mutations tracked in `auditLogs` table

## Convex Schema (key tables)

`tenants`, `users`, `tenantMemberships`, `services`, `bookings`, `bookingEvents`, `products`, `orders`, `orderItems`, `memberships`, `payments`, `subscriptions`, `stripeAccounts`, `posTransactions`, `checkIns`, `memberQrCodes`, `sessionPackages`, `sessionCredits`, `sessionLogs`, `vouchers`, `giftCards`, `notifications`, `pushTokens`, `staffAvailability`, `businessHours`, `blockedSlots`, `eInvoiceRequests`, `files`, `featureFlags`, `auditLogs`, `platformConfig`

## Commands

```bash
# Root (Turborepo)
pnpm dev           # Start all apps in dev mode
pnpm build         # Build all packages
pnpm lint          # Lint all packages
pnpm typecheck     # Type-check all packages
pnpm test          # Run all tests
pnpm clean         # Clean build artifacts + node_modules

# Convex backend
npx convex dev     # Start Convex dev mode (watches packages/api/convex/)
npx convex deploy  # Deploy Convex functions to production

# Web app
pnpm --filter @timeo/web dev    # Next.js dev server only
pnpm --filter @timeo/web build  # Build web app

# Mobile (from app directory)
pnpm --filter @timeo/customer ios      # Run customer app on iOS
pnpm --filter @timeo/customer android  # Run customer app on Android
# Same pattern for staff, admin, platform
```

## Deployment

- **Web** (`apps/web`): Dokploy on self-hosted VPS (Next.js standalone)
- **Mobile** (all 4 Expo apps): EAS Build (Expo Application Services)
- **Backend** (`packages/api`): Convex cloud — `https://mild-gnat-567.convex.cloud`

## Environment Variables

Key vars (see `.env.local` files per app):
- `NEXT_PUBLIC_CONVEX_URL` / `EXPO_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`
- Better Auth secrets (see `packages/auth/`)

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
