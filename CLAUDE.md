# Timeo

Multi-tenant SaaS platform for bookings and commerce operations.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Backend/DB**: Convex (real-time, serverless)
- **Auth**: Clerk
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI
- **Integrations**: Cal.com, Bagisto (webhook-based)
- **Icons**: Lucide React

## Project Structure

- `app/(app)/` — Authenticated app routes (tenant dashboard, onboarding)
- `app/(marketing)/` — Public landing page
- `app/(store)/` — Public storefront (booking, order history)
- `app/api/` — Webhooks (Cal.com, Bagisto) and cron dispatcher
- `components/ui/` — shadcn-style UI components
- `convex/` — Backend: schema, mutations, queries, RBAC, guards
- `lib/` — Utilities, Convex clients, webhook validation

## Key Patterns

- **Multi-tenancy**: Tenant-scoped data via `tenantId`, slug-based routing (`[tenantSlug]`)
- **RBAC**: Role hierarchy (owner > admin > manager > staff > member/customer) in `convex/lib/rbac.ts`
- **Tenant guards**: `withTenantGuard` wrapper in `convex/lib/guards.ts`
- **Sync events**: Webhook ingestion with idempotency, retry, dead-letter queue
- **Components**: shadcn/ui style with CVA variants

## Commands

```bash
npm run dev        # Start dev server (Next.js + Convex)
npm run build      # Production build
npm run lint       # ESLint
npx convex dev     # Convex dev mode
npx convex deploy  # Deploy Convex functions
```

## Skills Reference

### Core Development
- `/shadcn-ui` — Component discovery, installation, customization
- `/review-react-best-practices` — React/Next.js performance & reliability review
- `/workflow-feature-shipper` — Ship PR-sized features end-to-end
- `/tool-systematic-debugging` — Structured debugging methodology

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

### Future
- `/stripe` — Payment processing (when ready to add billing)
