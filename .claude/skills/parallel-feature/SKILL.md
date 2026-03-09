# Parallel Feature Skill

Spawn three agents in parallel to implement a full-stack feature simultaneously:

## Agent 1 — Backend
- Implement API routes and services in `apps/api/src/routes/`
- Add middleware, Drizzle queries, Zod validators
- Run `pnpm --filter @timeo/api typecheck` before reporting completion

## Agent 2 — Frontend
- Implement Next.js pages and components in `apps/web/`
- Wire TanStack Query hooks from `@timeo/api-client`
- Run `pnpm --filter @timeo/web typecheck` before reporting completion

## Agent 3 — Shared
- Update shared types in `packages/shared/`
- Add or update TanStack Query hooks in `packages/api-client/`
- Run `pnpm --filter @timeo/shared --filter @timeo/api-client typecheck` before reporting completion

## Rules
- Agent 3 (shared types) must complete before Agents 1 and 2 start consuming those types
- No two agents may edit the same file — if a conflict arises, pause and resolve with Agent 3 as owner of shared files
- Each agent reports: files changed, typecheck result (must be 0 errors)
- After all agents complete, run `pnpm typecheck` from root for final integration check
