# Platform Admin Dashboard — Spec

**Status**: Draft — awaiting approval
**App**: `apps/web/app/(app)/platform/`
**Actor**: Platform super-admin (`platform_admin` role)
**Stack**: Next.js App Router + shadcn/ui + TanStack Query → Hono API

---

## 1. Overview

The Platform Admin Dashboard is the super-admin control panel for Timeo operators. It gives the platform team a single pane of glass to:

- Manage all tenant accounts (create, suspend, delete, impersonate)
- Manage platform users and their roles
- Oversee subscription billing status per tenant
- Monitor system health (API, DB, Redis, queues)
- View cross-tenant analytics (MRR, ARR, churn, active tenants)
- Browse the audit activity log

Access is restricted to users with `platform_admin` role. The check happens in the Hono middleware (`requireRole("platform_admin")`) **and** in the Next.js middleware (`packages/auth/src/web/middleware.ts`).

---

## 2. Route Map

```
/platform                          → redirect → /platform/dashboard
/platform/dashboard                → Overview (health + key metrics cards)
/platform/tenants                  → Tenant list (table)
/platform/tenants/new              → Create tenant form
/platform/tenants/[tenantId]       → Tenant detail (tabs: Info, Members, Billing, Audit)
/platform/users                    → Platform user list
/platform/users/[userId]           → User detail
/platform/billing                  → Subscription & billing overview
/platform/analytics                → Analytics charts (MRR, tenant growth, etc.)
/platform/activity                 → Platform-wide audit log
/platform/flags                    → Feature flags management
/platform/flags/[key]              → Feature flag detail / edit
```

All routes are Server Components by default; data-mutation sections use Client Components.

---

## 3. Sections

### 3.1 Dashboard Overview (`/platform/dashboard`)

**Purpose**: First screen after login — quick health check + headline numbers.

**Layout**: 2-row grid

**Row 1 — System Health Bar** (horizontal strip, always visible at top):
| Indicator | Source | Status colors |
|-----------|--------|---------------|
| API | `GET /health` → `{ status: "ok" }` | green / red |
| Database | health endpoint field `db` | green / red |
| Redis | health endpoint field `redis` | green / red |
| Queue workers | health endpoint field `queues` | green / yellow / red |

**Row 2 — KPI Cards** (4 cards):
| Card | Metric | API endpoint |
|------|--------|-------------|
| Total Tenants | count of all tenants | `GET /platform/stats` |
| Active Tenants (30d) | tenants with ≥1 booking/order in last 30 days | same |
| MRR (RM) | sum of active subscription amounts | same |
| New Tenants (30d) | tenants created in last 30 days | same |

**Row 3 — Two-column**:
- Left: Recent Activity (last 10 audit log entries) — links to `/platform/activity`
- Right: Recent Tenant Signups (last 5) — links to `/platform/tenants`

---

### 3.2 Tenant Management (`/platform/tenants`)

**Purpose**: Full CRUD on tenant accounts.

**List view**:
- Table columns: Name, Slug, Plan, Status, Created, MRR, Actions
- Filters: Status (active / suspended / pending), Plan (free / starter / pro / enterprise), search by name/slug
- Pagination: 25 per page, server-side
- Bulk actions: Suspend selected, Delete selected (soft delete with confirmation modal)

**Create Tenant** (`/platform/tenants/new`):
Form fields:
- Business name (required)
- Slug (auto-generated from name, editable, unique check via API)
- Owner email (must exist in platform users; auto-invite if not)
- Plan (dropdown: free / starter / pro / enterprise)
- Country (default: MY)
- Currency (default: MYR)

On submit: `POST /platform/tenants` → redirect to `/platform/tenants/[tenantId]`.

**Tenant Detail** (`/platform/tenants/[tenantId]`):

Tabs:

1. **Info** — editable fields (name, slug, status, plan, settings JSONB preview)
2. **Members** — list of `tenant_memberships` (user, role, joined date); actions: change role, remove
3. **Billing** — current plan, subscription start/end, payment method, invoice history
4. **Audit** — filtered audit log entries for this tenant only

**Actions** available on detail page:
- `Suspend` / `Unsuspend` — changes `status` field, sends email notification to owner
- `Delete` — soft delete, requires typing tenant slug to confirm
- `Impersonate` — generates a time-limited impersonation token (`POST /platform/tenants/[id]/impersonate`), opens the tenant dashboard in a new tab with a banner "You are impersonating [Tenant]"

---

### 3.3 User Management (`/platform/users`)

**Purpose**: View and manage all users across the platform (not tenant-scoped).

**List view**:
- Table columns: Name, Email, Role, Tenants, Status, Last Login, Actions
- Filters: Role (`platform_admin`, `admin`, `staff`, `customer`), Status (active / suspended), search by email/name
- Pagination: 50 per page

**User Detail** (`/platform/users/[userId]`):
- Editable: name, role
- Read-only: email, created date, tenant memberships list
- Actions: Suspend/Unsuspend, Reset password (sends email), Revoke all sessions

---

### 3.4 Subscription & Billing (`/platform/billing`)

**Purpose**: Overview of all tenant subscriptions and revenue.

**Layout**:
- Top KPI strip: MRR, ARR, Churn Rate (30d), Average Revenue Per Tenant
- Table: all active subscriptions (Tenant, Plan, Amount/mo, Start Date, Next Renewal, Status)
- Filters: Plan, Status (active / past_due / cancelled)

**Actions per row**:
- `View tenant` → navigates to `/platform/tenants/[id]`
- `Cancel subscription` → confirmation modal → `DELETE /platform/subscriptions/[id]`
- `Change plan` → inline dropdown → `PATCH /platform/subscriptions/[id]`

> Note: Revenue Monster does not support recurring billing. Subscriptions are tracked manually in the `subscriptions` table. Billing reminders are sent via Novu (email/WhatsApp) 7 days before renewal. The platform admin manually processes FPX payments or records payments here.

---

### 3.5 Analytics Overview (`/platform/analytics`)

**Purpose**: Cross-tenant growth and revenue charts.

**Charts** (all time-range selectable: 7d / 30d / 90d / 12m):

| Chart | Type | Metric |
|-------|------|--------|
| Tenant Growth | Line | Cumulative tenant signups over time |
| MRR Growth | Area | MRR by month |
| Bookings Volume | Bar | Total bookings across all tenants per day |
| Orders Volume | Bar | Total orders across all tenants per day |
| Revenue by Plan | Donut | MRR split by plan tier |
| Top Tenants by Revenue | Horizontal bar | Top 10 tenants by MRR |

**API**: `GET /platform/analytics?range=30d`

**Library**: Recharts (already in web app deps).

---

### 3.6 Activity Log (`/platform/activity`)

**Purpose**: Platform-wide audit trail for compliance and debugging.

**Table columns**:
- Timestamp
- Actor (user email + role)
- Action (e.g., `tenant.created`, `user.suspended`, `subscription.cancelled`)
- Target (tenant name / user email / entity ID)
- IP Address
- Details (expandable JSON)

**Filters**:
- Date range (date picker)
- Actor (search by email)
- Action type (dropdown of action categories)
- Tenant (search by name)

**Pagination**: 100 per page, cursor-based for performance.

**API**: `GET /platform/audit-logs?cursor=&limit=100&filters=...`

> All platform admin actions are automatically written to `audit_logs` table by Hono middleware.

---

### 3.7 Feature Flags (`/platform/flags`)

**Purpose**: Runtime feature toggles per tenant or globally.

**List view**:
- Table: Key, Description, Enabled (global), Tenant Overrides count, Last Modified
- Toggle global enable/disable inline

**Flag Detail** (`/platform/flags/[key]`):
- Global enabled/disabled toggle
- Per-tenant overrides table: Tenant, Override value (on/off), Set by, Set at
- Add override: tenant search + toggle
- Remove override

**API**:
- `GET /platform/flags` — list all
- `PATCH /platform/flags/[key]` — update global value
- `POST /platform/flags/[key]/overrides` — add tenant override
- `DELETE /platform/flags/[key]/overrides/[tenantId]` — remove override

---

## 4. Navigation

Sidebar navigation (within the `(app)/platform/` layout):

```
Platform Admin
├── Dashboard          /platform/dashboard
├── Tenants            /platform/tenants
├── Users              /platform/users
├── Billing            /platform/billing
├── Analytics          /platform/analytics
├── Activity Log       /platform/activity
└── Feature Flags      /platform/flags
```

The sidebar uses the existing `DashboardSidebar` component pattern from `apps/web/components/layout/`.

---

## 5. API Endpoints Required

All under `/platform/*`, protected by `requireRole("platform_admin")` middleware.

```
GET    /platform/stats                          → KPI numbers
GET    /platform/health                         → system health (extend existing /health)

GET    /platform/tenants                        → paginated list
POST   /platform/tenants                        → create
GET    /platform/tenants/:id                    → detail
PATCH  /platform/tenants/:id                   → update
DELETE /platform/tenants/:id                   → soft delete
POST   /platform/tenants/:id/suspend           → toggle suspend
POST   /platform/tenants/:id/impersonate       → get impersonation token

GET    /platform/users                          → paginated list
GET    /platform/users/:id                      → detail
PATCH  /platform/users/:id                     → update role/status
POST   /platform/users/:id/revoke-sessions     → sign out everywhere

GET    /platform/subscriptions                  → all subscriptions
PATCH  /platform/subscriptions/:id            → change plan
DELETE /platform/subscriptions/:id            → cancel

GET    /platform/analytics                      → chart data (?range=30d)

GET    /platform/audit-logs                     → paginated, cursor-based

GET    /platform/flags                          → all feature flags
PATCH  /platform/flags/:key                   → update global value
POST   /platform/flags/:key/overrides         → add tenant override
DELETE /platform/flags/:key/overrides/:tenantId → remove override
```

---

## 6. Auth & Security

- **Middleware**: `requireRole("platform_admin")` on all `/platform/*` API routes
- **Next.js middleware**: Already guards `(app)/platform/` routes in `packages/auth/src/web/middleware.ts`
- **Impersonation tokens**: Short-lived (15 min), stored in Redis, single-use, include actor ID in audit log
- **Audit logging**: Every mutating action writes to `audit_logs` (actor, action, target, ip, payload hash)
- **No PII in logs**: Audit log details store entity IDs, not raw personal data

---

## 7. Component Inventory

Reuse existing shadcn/ui components:

| Component | Usage |
|-----------|-------|
| `DataTable` | All list views (tenants, users, subscriptions, audit) |
| `Card` | KPI cards, health indicators |
| `Tabs` | Tenant detail tabs |
| `Dialog` | Confirmation modals (suspend, delete, impersonate) |
| `Select`, `Input`, `Form` | Filters and create/edit forms |
| `Badge` | Status chips (active, suspended, plan tiers) |
| `Recharts` | Analytics charts |

New components to create:
- `SystemHealthBar` — horizontal strip with colored status dots
- `ImpersonationBanner` — top-of-page banner shown during impersonation session
- `AuditLogTable` — specialized table with expandable JSON rows

---

## 8. Out of Scope (Phase 1)

- White-label theming per tenant (Phase 3)
- Revenue Monster payment recording UI (handled in tenant billing portal)
- Platform-level notification sending (Novu campaigns)
- Multi-region support

---

## 9. Open Questions

1. **Impersonation session isolation**: Should impersonation open a separate browser tab or use a session override cookie? (Recommendation: separate tab with `?impersonate=<token>` query param, cleared on tab close)
2. **Billing data source**: Is the `subscriptions` table the source of truth for MRR, or do we calculate from `payments`? (Recommendation: `subscriptions.amount_cents * active_count` for MRR simplicity)
3. **Audit log retention**: How long do we keep audit logs? (Recommendation: 90 days hot, archive to S3 cold storage after)
