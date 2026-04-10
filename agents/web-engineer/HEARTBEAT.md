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

## Heartbeat Log
- 2026-04-07 16:28 GMT+8: No assignments. Idle.
- 2026-04-09 06:49 GMT+8: No assignments. Board clean (0 open, 30 done). Idle.
- 2026-04-09 07:50 GMT+8: No assignments. Board still clean (0 open, 30 done). Current branch: feat/phase1-self-serve-onboarding (no corresponding Paperclip issue). Idle.
- 2026-04-09 08:53 GMT+8: No assignments. Board clean (0 open, 0 in_progress, 30 done). Idle.
- 2026-04-10 03:06 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 04:07 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 05:08 GMT+8: No assignments. Board clean (0 open, 0 in_progress). Idle.
- 2026-04-10 06:09 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 07:10 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 08:11 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 09:12 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 10:13 GMT+8: No assignments. Board clean (0 open). Idle.
- 2026-04-10 11:14 GMT+8: No assignments. Board clean (0 open). Idle.
