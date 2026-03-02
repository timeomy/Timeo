# Feature: Timeo C2 — Platform Control Center

## Status: draft
## Priority: P0 (critical)
## Phase: 1

---

## Overview

Timeo C2 is the **single unified admin interface** where Platform IT manages the entire Timeo ecosystem — every tenant, user, subscription, payment, feature, config, deployment, and system health — from one dashboard without ever touching code, config files, CLI, or individual database records.

Think of it as the "mission control" for Timeo. If it exists in the platform, it can be viewed, configured, and controlled from C2.

---

## Why C2 Exists

Without C2, managing Timeo means:
- SSH into the VPS to check logs
- Edit database records manually to change tenant plans
- Modify `.env` files to toggle features
- Open Revenue Monster dashboard separately to check payments
- No visibility into what's happening across tenants

With C2, you:
- See everything in one screen
- Click to onboard tenants, change plans, suspend accounts
- Toggle features per tenant without deploying code
- Monitor system health, errors, and revenue live
- Control email templates, branding defaults, and pricing
- Never touch the terminal for day-to-day operations

---

## C2 Modules

### 1. Command Dashboard (Home)
The first screen when you log into C2. Live overview of the entire platform.

**Contents:**
- System health bar: API status, PostgreSQL status, Redis status, queue depth, uptime
- 4 KPI cards: Total tenants, Active users (24h), Today's revenue (MYR), Orders today
- Revenue chart (last 30 days, MRR trend)
- Recent activity feed: latest signups, orders, errors, tenant actions
- Alerts panel: expiring subscriptions, failed payments, error spikes, disk usage warnings
- Quick actions: onboard tenant, broadcast announcement, toggle maintenance mode

### 2. Tenant Management
Full lifecycle control over every tenant business on the platform.

**List View:**
- Searchable, filterable table of all tenants
- Columns: name, slug, plan, status (active/suspended/trial), MRR, users count, created date
- Bulk actions: suspend, activate, export

**Detail View (tabbed):**
- **Overview** — business name, slug, domain, plan, created date, subscription status
- **Members** — all users in this tenant with roles, invite new member, change roles, remove
- **Billing** — current plan, payment history, invoices, manually mark payment received, change plan, apply credit
- **Branding** — logo upload, color scheme, custom domain config, receipt branding — live preview
- **Features** — toggle feature flags for this specific tenant (override global defaults)
- **Activity** — audit log of all actions within this tenant
- **Settings** — business hours, timezone, currency, tax rate, receipt footer, notification preferences
- **Danger Zone** — suspend tenant, delete tenant (with confirmation), export all data

**Actions:**
- Onboard new tenant (wizard: business name → plan → admin user → branding → done)
- Impersonate tenant admin (see their dashboard as they see it, with audit trail)
- Clone tenant (duplicate settings/config for new tenant)

### 3. User Management
Cross-tenant user management.

**Contents:**
- Global user list with search + filters (role, tenant, status, last active)
- User detail: profile, all tenant memberships, sessions, login history
- Actions: edit role per tenant, deactivate, force logout (revoke sessions), reset password link, delete
- Detect: users with no tenant membership, duplicate emails, unverified accounts

### 4. Subscription & Billing Control
Revenue and subscription management without touching the database.

**Contents:**
- MRR / ARR dashboard with trend charts
- Subscription table: all tenants with plan, status, next payment date, amount
- Plan management: create/edit/delete subscription plans (name, price, features included, limits)
- Payment log: all Revenue Monster transactions across tenants
- Actions: manually record payment, issue refund, extend trial, apply discount, change plan
- Dunning: auto-reminder config for overdue payments, grace period settings
- Invoice templates: customize invoice layout, add/remove fields
- Revenue Monster connection status + webhook health

### 5. Feature Flags
Control what features are available globally and per-tenant, without deploying code.

**Contents:**
- Global feature flag list with toggles (e.g., `pos_enabled`, `appointments_enabled`, `loyalty_enabled`, `offline_sync`, `custom_domain`)
- Per-tenant overrides: enable/disable specific features for individual tenants
- Rollout controls: percentage rollout (e.g., enable for 20% of tenants), specific tenant list
- Feature metadata: name, description, phase, default state
- Change history: who toggled what, when

### 6. Platform Configuration
All platform-wide settings in one place. No more `.env` editing.

**Contents:**
- **General** — platform name, support email, default timezone, default currency, default language
- **Auth** — password requirements, session duration, OAuth providers enable/disable, OTP settings
- **Email** — SMTP config (host, port, user, password), test email button, from address, reply-to
- **Payment** — Revenue Monster credentials (client ID, secret, store ID), sandbox/production toggle
- **Branding Defaults** — default logo, colors, receipt template for new tenants
- **Pricing** — default plans, trial duration, grace period
- **Limits** — max users per tenant, max products, max orders/day per plan
- **Maintenance Mode** — toggle on/off, custom message, estimated time, whitelist IPs
- **Localization** — supported languages, default language, currency format, date format

### 7. Analytics & Reports
Platform-wide intelligence.

**Contents:**
- **Tenant Growth** — new tenants over time, churn rate, trial-to-paid conversion
- **Revenue** — MRR, ARR, revenue by plan, revenue by payment method, ARPU
- **Usage** — orders volume, appointment bookings, active users, API calls per tenant
- **Top Tenants** — by revenue, by orders, by users
- **Cohort Analysis** — tenant retention by signup month
- **Export** — download any report as CSV or PDF
- **Scheduled Reports** — configure auto-email weekly/monthly summaries

### 8. Activity & Audit Log
Full audit trail of everything that happens on the platform.

**Contents:**
- Searchable, filterable log of all platform actions
- Filters: by user, by tenant, by action type, by date range, by severity
- Action types: tenant created, user role changed, plan changed, feature toggled, payment received, login, settings changed
- Detail view: who did what, when, from which IP, affected resource
- Export audit log
- Retention settings: how long to keep logs

### 9. System Health & Monitoring
Infrastructure monitoring without SSH.

**Contents:**
- **Services** — API, PostgreSQL, Redis, Queue worker, Socket.io — status + uptime
- **Metrics** — CPU, RAM, disk usage, network I/O (pulled from VPS/Dokploy)
- **API Metrics** — requests/sec, avg response time, error rate, slowest endpoints
- **Database** — connection pool status, query count, slow queries, table sizes
- **Redis** — memory usage, keys count, hit rate
- **Error Tracking** — recent errors with stack traces, grouped by type, frequency
- **Deployment** — current version, last deploy time, deploy history
- **Actions** — restart services, clear Redis cache, run migrations, trigger backup

### 10. Communication Center
Reach tenants and users without external tools.

**Contents:**
- **Announcements** — broadcast messages to all tenants (shown in their dashboard)
- **Email Templates** — manage all transactional email templates (verification, password reset, booking confirmation, payment receipt, welcome email)
- **Template Editor** — WYSIWYG editor for email templates with variables (tenant name, user name, etc.)
- **Notification Rules** — configure which events trigger emails/push notifications
- **Broadcast Email** — send one-time emails to all tenant admins or all users (with filters)

### 11. API & Integrations
Manage API access and external integrations.

**Contents:**
- **API Keys** — generate/revoke API keys for third-party integrations
- **Webhook Management** — list all registered webhooks, delivery status, retry failed
- **POS Terminal Management** — view connected Revenue Monster terminals per tenant
- **Integration Status** — Revenue Monster, SMTP, Socket.io — connection health
- **API Documentation** — embedded API docs (auto-generated from Hono routes)
- **Rate Limiting** — view/configure rate limits per tenant or global

### 12. Data Management
Database operations without SQL.

**Contents:**
- **Backup** — trigger manual backup, view backup history, restore from backup
- **Data Export** — export tenant data (GDPR compliance), export platform data
- **Data Import** — bulk import tenants, users, products from CSV
- **Seed Data** — apply seed data to new or demo tenants
- **Database Migrations** — view migration history, run pending migrations (with confirmation)
- **Danger Zone** — purge old data, clean up orphaned records

---

## Technical Approach

### Where C2 Lives
C2 is the `apps/web/app/(platform)/` section of the Next.js app. It is protected by `requireRole("platform_admin")` middleware.

### Route Structure
```
apps/web/app/(platform)/
├── layout.tsx                  ← C2 sidebar layout
├── page.tsx                    ← Command Dashboard (home)
├── tenants/
│   ├── page.tsx                ← Tenant list
│   ├── new/page.tsx            ← Onboard wizard
│   └── [id]/
│       ├── page.tsx            ← Tenant detail (tabbed)
│       └── impersonate/page.tsx
├── users/
│   ├── page.tsx                ← User list
│   └── [id]/page.tsx           ← User detail
├── billing/
│   ├── page.tsx                ← Subscription overview
│   ├── plans/page.tsx          ← Plan management
│   └── invoices/page.tsx       ← Invoice management
├── features/page.tsx           ← Feature flags
├── config/
│   ├── page.tsx                ← General config
│   ├── auth/page.tsx
│   ├── email/page.tsx
│   ├── payment/page.tsx
│   └── branding/page.tsx
├── analytics/
│   ├── page.tsx                ← Overview
│   ├── revenue/page.tsx
│   └── usage/page.tsx
├── activity/page.tsx           ← Audit log
├── health/page.tsx             ← System monitoring
├── communications/
│   ├── page.tsx                ← Announcements
│   └── templates/page.tsx      ← Email templates
├── integrations/page.tsx       ← API & integrations
└── data/
    ├── page.tsx                ← Backup & export
    └── import/page.tsx         ← Data import
```

### API Endpoints (Platform Routes)
All under `/api/platform/` with `platform_admin` role required:

**Tenants:** CRUD, suspend, activate, impersonate, clone, export
**Users:** list, detail, update role, deactivate, force logout, delete
**Billing:** plans CRUD, subscriptions, record payment, refund, invoices
**Features:** list flags, toggle global, toggle per-tenant, rollout config
**Config:** get/set all platform config sections (stored in `platform_config` table)
**Analytics:** tenant growth, revenue, usage, top tenants, cohort, export
**Activity:** query audit log with filters, export
**Health:** service status, metrics, errors, restart, cache clear
**Communications:** announcements CRUD, templates CRUD, broadcast
**Integrations:** API keys, webhooks, terminal status, rate limits
**Data:** trigger backup, export, import CSV, run migrations

### New Database Tables

```sql
-- Platform configuration (key-value, replaces .env for runtime config)
platform_config — id, section, key, value (JSONB), updated_at, updated_by

-- Feature flags
feature_flags — id, key, name, description, default_enabled, phase, created_at
feature_flag_overrides — id, feature_flag_id, tenant_id, enabled, created_at

-- Audit log
audit_log — id, actor_id, actor_role, tenant_id (nullable), action, resource_type, resource_id, details (JSONB), ip_address, created_at

-- Announcements
announcements — id, title, body, type (info|warning|critical), target (all|admins), active, created_by, created_at, expires_at

-- Email templates
email_templates — id, key (verification|reset|booking_confirm|payment_receipt|welcome), subject, body_html, body_text, variables (JSONB), updated_at

-- API keys
api_keys — id, tenant_id (nullable for platform keys), name, key_hash, permissions (JSONB), last_used_at, expires_at, created_at

-- Subscription plans
plans — id, name, slug, price_cents, interval (monthly|yearly), features (JSONB), limits (JSONB), active, sort_order
```

### Config Storage Pattern
Instead of `.env` for runtime settings, use `platform_config`:

```typescript
// Get config
const smtpHost = await getConfig('email', 'smtp_host');

// Set config (from C2 UI)
await setConfig('email', 'smtp_host', 'smtp-relay.brevo.com', adminUserId);

// Fallback to .env for secrets that should never be in DB
// (DATABASE_URL, REDIS_URL, RM_PRIVATE_KEY)
```

---

## Security

- All C2 routes protected by `requireRole("platform_admin")`
- Impersonation creates time-limited token in Redis (30 min), logged to audit
- Sensitive actions (delete tenant, run migration, change payment config) require confirmation + re-authentication
- All C2 actions logged to `audit_log` with actor, IP, timestamp
- API keys are hashed (bcrypt), only shown once on creation
- Rate limiting on all C2 API endpoints
- C2 accessible only from specific IPs (configurable) or with 2FA

---

## UI Design

- Dark sidebar with C2 module navigation (collapsible)
- Top bar: search everything, notifications bell, current user, quick actions
- Responsive but optimized for desktop (this is an admin tool)
- Use shadcn/ui components: DataTable, Tabs, Card, Dialog, Sheet, Command palette
- Status colors: green (healthy), yellow (warning), red (critical)
- Keyboard shortcuts for power users (Cmd+K for command palette)
- Real-time updates via Socket.io (new orders, errors, health changes)
