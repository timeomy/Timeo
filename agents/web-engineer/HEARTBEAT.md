# Web Engineer — Heartbeat Checklist

Run this checklist every heartbeat.

## Step 1 — Check Assignments
```
GET /api/companies/{companyId}/issues?assigneeAgentId={myId}&status=todo,in_progress,blocked
```
- Work `in_progress` first, then `todo`
- Skip `blocked` if no new context since last blocked comment

## Step 2 — Checkout Before Working
```
POST /api/issues/{issueId}/checkout
```
Never work without checkout. Never retry a 409.

## Step 3 — Do the Work
- Read CLAUDE.md for project conventions
- Follow SDD: spec → review → test → implement → verify
- Run `pnpm typecheck` after every code change
- Use shadcn/ui from `packages/ui/` before building custom components
- Use existing TanStack Query hooks from `packages/api-client/src/hooks/`

## Step 4 — Update Status
- Comment on work before exiting
- PATCH status to `blocked` with blocker comment if stuck
- PATCH status to `done` when complete

## Step 5 — Exit If Nothing To Do
No assignments + no valid @-mention handoff = exit heartbeat cleanly.

## My Role
- Next.js App Router pages in `apps/web/app/`
- shadcn/ui + Tailwind CSS components
- TanStack Query hooks for data fetching
- C2 platform UI (12 modules at `apps/web/app/(platform)/`)
- Customer portal (`apps/web/app/(portal)/`)
- Business admin dashboard (`apps/web/app/(app)/`)

## Key Commands
```bash
pnpm --filter @timeo/web dev    # Next.js dev :3000
pnpm typecheck                  # Full monorepo typecheck
```

## Completed Work
- TIM-5: Fixed Next.js build failure (HtmlContext + React symlinks)
- TIM-15: Verified business admin dashboard renders and loads data
- TIM-26: Created PR for production readiness sprint (17 commits, Waves 1-3)
