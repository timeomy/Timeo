# Tenant Template System (Stage 1 Design)

## Status
- Stage 1 design only (no implementation in this document).
- Objective: define a tenant template architecture for Timeo’s Shopify-for-services direction.

## Hard Constraints (Non-Negotiable)
- Templates are **structure-only**: layout, navigation, widgets, page composition, feature defaults, and settings defaults.
- Templates **must not** include demo or seed business data (members, bookings, classes, products, transactions, or placeholder operational records).
- New tenants start with an **empty business dataset** and a pre-shaped experience.
- Existing tenants (including WS Fitness with 415 real members) must not have any business data changed.
- Stage 1 stops at design documentation.

## 1) Problem Statement
Timeo supports multiple industries with different operational needs. A tenant should receive a ready-to-use member portal and admin panel immediately at creation, while still being able to customize structure over time. The starting point must be industry-aware, but safely isolated from business data.

## 2) Design Goals
- Provide a default tenant skeleton for both member-facing and admin-facing experiences.
- Keep templates declarative and versioned.
- Preserve per-tenant customization without breaking upgradeability.
- Reuse existing `tenants.settings`, `tenants.branding`, and feature-flag infrastructure where possible.
- Enforce strict separation between structural configuration and business records.

## 3) Template Schema (Structure Only)

### 3.1 Canonical Template Object
```json
{
  "schemaVersion": 1,
  "templateKey": "fitness",
  "industry": "fitness",
  "displayName": "Fitness Base",
  "description": "Industry skeleton for fitness operators",
  "featureDefaults": {
    "bookings_enabled": true,
    "memberships_enabled": true,
    "classes_enabled": true,
    "pos_enabled": false,
    "einvoice_enabled": false,
    "turnstile_enabled": false,
    "loyalty_enabled": false
  },
  "settingsDefaults": {
    "timezone": "Asia/Kuala_Lumpur",
    "currency": "MYR",
    "industry": "fitness"
  },
  "brandingDefaults": {
    "primaryColor": null,
    "secondaryColor": null,
    "logoUrl": null,
    "companyDisplayName": null
  },
  "memberPortal": {
    "layout": {
      "shell": "mobile_bottom_tabs",
      "breakpoints": ["mobile", "tablet", "desktop"]
    },
    "navigation": [
      {
        "id": "member.home",
        "labelKey": "nav.home",
        "icon": "home",
        "route": "/member/home",
        "pageId": "member.home",
        "visibility": { "requiresFlags": [] }
      }
    ],
    "pages": [
      {
        "id": "member.home",
        "titleKey": "page.member.home",
        "layout": "stack",
        "blocks": [
          {
            "id": "member.summary",
            "type": "member_summary",
            "config": {},
            "visibility": { "requiresFlags": [] }
          }
        ]
      }
    ]
  },
  "adminPanel": {
    "layout": {
      "shell": "sidebar_topbar",
      "breakpoints": ["desktop", "tablet"]
    },
    "menu": [
      {
        "id": "admin.dashboard",
        "labelKey": "menu.dashboard",
        "icon": "layout-dashboard",
        "route": "/dashboard",
        "pageId": "admin.dashboard",
        "visibility": { "requiresFlags": [] }
      }
    ],
    "pages": [
      {
        "id": "admin.dashboard",
        "titleKey": "page.admin.dashboard",
        "layout": "grid",
        "widgets": [
          {
            "id": "admin.kpi.overview",
            "type": "kpi_overview",
            "config": {},
            "visibility": { "requiresFlags": [] }
          }
        ]
      }
    ]
  },
  "editableZones": {
    "memberPortal": true,
    "adminPanel": true,
    "featureDefaults": true,
    "settingsDefaults": true
  }
}
```

### 3.2 Schema Rules
- `templateKey` + `industry` identify the starting skeleton.
- `featureDefaults` define intended capability baseline (no business data).
- `settingsDefaults` define safe default operational config values.
- `brandingDefaults` provide empty/null placeholders for tenant-specific branding values.
- `memberPortal` and `adminPanel` define composition only (pages, blocks/widgets, nav/menu).
- `config` objects inside blocks/widgets are structural parameters only.

## 4) How Templates Apply on Tenant Creation

### 4.1 Creation Flow
1. Tenant creation receives `industry` (stored in `tenants.settings.industry`).
2. Template resolver picks the current published template for that industry.
3. System creates template assignment and empty override records.
4. System computes effective feature flags (template defaults + existing flag system).
5. Tenant is ready with structural UI scaffolding and empty operational state.

### 4.2 Data Safety Guarantee
- Writes on creation are limited to tenant metadata/config records only.
- No inserts into business-domain tables such as members, products, bookings, classes, invoices, payments, subscriptions, or transactions.
- Empty states are handled in UI components when tenant has no business records.

## 5) Tenant Admin Customization Model

### 5.1 Three-Layer Configuration
1. **Base template** (platform-managed, versioned, immutable per version).
2. **Tenant overrides** (admin-managed structural customizations).
3. **Resolved runtime config** (base merged with overrides).

### 5.2 Customization Interfaces
- **Builder UI (recommended primary):** drag/reorder/hide/show pages, blocks, widgets, menu items.
- **JSON config API (advanced):** patch override documents via validated endpoint.
- **Guardrails:** tenant admin cannot define unknown block/widget types or bypass feature flag restrictions.

### 5.3 Customization Boundaries
- Allowed: navigation order, visible modules, page/widget/block arrangement, label keys, layout options, enabled feature toggles (within plan/policy).
- Not allowed: writing tenant business records through template APIs.

## 6) Member View Page/Block System

### 6.1 Core Concepts
- `Page`: route-level container.
- `Block`: reusable member-facing UI unit.
- `Block registry`: allowlisted block types and JSON schema validators.
- `Visibility`: conditional rendering based on role/flag/plan.

### 6.2 Block Lifecycle
- Template declares block placement and config.
- Runtime fetches real tenant data from existing domain APIs.
- If no data exists, block renders a built-in empty state (onboarding prompts, not demo records).

### 6.3 Block Types (Initial)
- `member_summary`
- `upcoming_bookings`
- `membership_status`
- `class_schedule`
- `service_catalog`
- `invoice_history`
- `loyalty_balance`

## 7) Admin Panel Widget/Menu System

### 7.1 Core Concepts
- `Menu item`: route access point in admin shell.
- `Admin page`: operational screen definition.
- `Widget`: dashboard component powered by real-time tenant metrics or operational queues.

### 7.2 Widget Types (Initial)
- `kpi_overview`
- `today_schedule`
- `pending_payments`
- `new_members`
- `inventory_alerts`
- `staff_utilization`
- `compliance_tasks`

### 7.3 Admin Flow Composition
- Template declares menu hierarchy and page widgets.
- Tenant admin can reorder/hide items and choose allowed widgets.
- Feature flags gate unavailable modules cleanly.

## 8) Industry Template Catalog (Initial)

| Industry Key | Member Portal Skeleton | Admin Panel Skeleton | Default Feature Emphasis |
|---|---|---|---|
| `fitness` | Membership, classes, bookings, invoices | Dashboard, members, class ops, billing | memberships, classes, bookings, turnstile(optional) |
| `salon` | Appointments, service catalog, loyalty, invoices | Schedule, staff rota, services, POS | bookings, POS, loyalty |
| `mssp` | Service tickets, subscription status, invoices | Client accounts, ticket queue, SLA, billing | memberships/subscriptions, invoicing |
| `retail` | Product catalog, order history, loyalty | Orders, inventory, POS, customers | POS, loyalty, e-invoice |
| `restaurant` | Reservations, menu ordering, loyalty | Table ops, kitchen queue, POS | bookings, POS, loyalty |
| `wellness` | Programs, appointments, packages | Practitioners, sessions, billing | bookings, memberships |
| `coaching` | Session credits, appointments, progress | Client pipeline, sessions, packages | bookings, memberships |
| `physio` | Treatment plans, appointment history | Caseload, treatment sessions, billing | bookings, invoicing |
| `clinic` | Appointment flow, records access, invoices | Front desk, practitioners, billing, compliance | bookings, e-invoice |

> Note: Catalog entries describe only structure and feature intent. No business rows are pre-created.

## 9) Per-Tenant Feature Flag System

### 9.1 Reuse Existing Platform Tables
- Existing `feature_flags` remains global flag registry.
- Existing `feature_flag_overrides` remains tenant-level override store.
- Template adds an intermediate default source during tenant bootstrap.

### 9.2 Resolution Order
`tenant override` → `template default` → `global default_enabled`

### 9.3 Behavior
- At tenant creation, template defaults are materialized as overrides only when they differ from global defaults.
- Tenant/admin toggles continue using override APIs.
- Effective flag payload should include source metadata (`override`, `template`, `global`).

## 10) DB Schema Additions

### 10.1 New Tables
1. `tenant_templates`
   - `id`, `key` (unique), `industry`, `name`, `status` (`draft|published|archived`), `current_version`, `created_by`, `created_at`, `updated_at`
2. `tenant_template_versions`
   - `id`, `template_id`, `version`, `schema_version`, `definition` (jsonb), `is_published`, `published_by`, `published_at`, `created_at`
   - Unique: (`template_id`, `version`)
3. `tenant_template_assignments`
   - `id`, `tenant_id` (unique), `template_id`, `template_version_id`, `industry_snapshot`, `source`, `is_pinned`, `applied_by`, `applied_at`
4. `tenant_ui_overrides`
   - `id`, `tenant_id` (unique), `member_portal_override` (jsonb default `{}`), `admin_panel_override` (jsonb default `{}`), `updated_by`, `updated_at`, `revision`

### 10.2 Existing Tables Reused
- `tenants.settings` (already stores `industry`, timezone, currency, etc.)
- `tenants.branding` (tenant-specific brand values)
- `feature_flags`, `feature_flag_overrides`
- `audit_logs`

### 10.3 Safety Principle
No changes to domain/business tables are required for Stage 1 design.

## 11) API Endpoints (Proposed)

### 11.1 Platform Admin (Jabez) Endpoints
- `GET /api/platform/templates` — list templates + published versions.
- `POST /api/platform/templates` — create template draft.
- `POST /api/platform/templates/:templateId/versions` — create new draft version.
- `POST /api/platform/templates/:templateId/versions/:version/publish` — publish selected version.
- `GET /api/platform/tenants/:tenantId/template` — fetch tenant assignment + resolved config metadata.
- `POST /api/platform/tenants/:tenantId/template/assign` — assign/reassign template (structure only).
- `POST /api/platform/template-migrations/preview` — dry-run assignment plan.
- `POST /api/platform/template-migrations/execute` — apply assignments (no domain data mutation).

### 11.2 Tenant Admin Endpoints
- `GET /api/tenants/:tenantId/ui-config/member` — resolved member portal config.
- `PATCH /api/tenants/:tenantId/ui-config/member` — update member override JSON.
- `GET /api/tenants/:tenantId/ui-config/admin` — resolved admin panel config.
- `PATCH /api/tenants/:tenantId/ui-config/admin` — update admin override JSON.
- `POST /api/tenants/:tenantId/ui-config/reset` — reset overrides by scope (`member|admin|all`).
- `GET /api/tenants/:tenantId/feature-flags` — effective flags + source metadata (extend existing payload).
- `PATCH /api/tenants/:tenantId/branding` — existing branding endpoint remains primary branding write path.

### 11.3 Tenant Creation Endpoint Extension
- Extend existing tenant creation with optional `industry` and optional `templateKey` override.
- If `templateKey` omitted, resolver uses `industry`.

## 12) Migration Strategy for Existing 4 Tenants (Zero Data Change)

### 12.1 Scope
Tenants in scope now:
- WS Fitness
- Oxloz Advisory
- Sakura Beauty
- Oil Palm Company

### 12.2 Strategy
1. Read each tenant’s `settings.industry`.
2. Normalize to supported industry keys.
3. Create only template assignment + empty override rows.
4. Do not modify existing tenant business/domain tables.
5. Log every assignment in `audit_logs` with actor and timestamp.

### 12.3 Safety Controls
- Migration runs in dry-run mode first and outputs planned assignments.
- Execution mode is idempotent (`upsert` assignment/override records).
- Fail closed on unknown industry key (no fallback auto-write).
- Validate row-count parity before/after on critical business tables (memberships, bookings, products, classes, transactions, invoices).

### 12.4 WS Fitness Protection
- Explicit guardrail for WS Fitness tenant ID: migration allowed only for assignment metadata tables.
- No mutation of the 415-member business dataset.

## 13) Platform Admin (Jabez) Template Management Model

### 13.1 Ownership
- Platform admin controls template lifecycle globally.
- Tenant admins control only their own overrides.

### 13.2 Lifecycle
1. Draft template/version.
2. Validate schema + preview resolved config.
3. Publish version.
4. Assign to new/existing tenants.
5. Monitor adoption and audit trail.

### 13.3 Governance Controls
- Versioned publish model (no in-place mutation of published versions).
- Tenant assignment can be pinned to a specific version.
- Optional staged rollout by tenant set.
- All actions audited in `audit_logs`.

## 14) Out of Scope for Stage 1
- Implementing schema migrations.
- Building template builder UI.
- Shipping runtime renderer changes.
- Backfilling or generating business records.
- Deployment.

## 15) Acceptance Criteria for Stage 1
- Design captures structure-only schema with explicit no-seed-data rule.
- Covers tenant creation flow, customization model, member/admin composition, industry catalog, feature flags, DB/API shape, and existing-tenant migration strategy.
- Enforces zero business-data changes for existing tenants.

## 16) Stage 2 Implementation Notes
- Implemented DB migration: `packages/db/drizzle/0010_tenant_templates.sql`
  - Adds `tenant_templates`, `tenant_template_versions`, `tenant_template_assignments`, `tenant_ui_overrides`
  - Adds `tenant_template_status` enum (`draft|published|archived`)
  - Adds indexes on tenant/template/industry lookup columns.
- Implemented schema models: `packages/db/src/schema/tenant-templates.ts`
  - Exported via `packages/db/src/schema/index.ts`
- Added structure-only seed script: `packages/db/src/seed-templates.ts`
  - Seeds 9 industry templates (version 1, published) with no business rows.
- Added existing-tenant migration script: `packages/db/src/migrate-existing-tenants-to-templates.ts`
  - Defaults to dry-run, supports `--execute`, fails closed on unknown industries.
  - Writes are allowlisted to `tenant_template_assignments` and `tenant_ui_overrides` only.
- Added verification helper: `scripts/verify-tenant-templates.ts`
  - Validates table presence, template seed count, and business-table row-count parity.
