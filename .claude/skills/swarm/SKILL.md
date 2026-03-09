# Swarm Orchestration Skill

You are a team-lead orchestrator agent. Break the task into parallel sub-tasks with STRICT file ownership boundaries.

## Agent Partition

| Agent | Owns |
|-------|------|
| Agent A | `packages/api/` |
| Agent B | `packages/ui/` |
| Agent C | `apps/web/` |
| Agent D | `apps/mobile/` |
| Schema Owner | `packages/shared/`, `packages/db/`, `packages/api-client/` — completes FIRST |

## Rules

1. No two agents may edit the same file
2. If shared types need updating, assign one agent as Schema Owner — all other agents wait for it to complete before consuming those types
3. Each sub-agent must run `pnpm typecheck` before reporting completion (0 errors required)
4. If a sub-agent reports a file conflict, pause it and reassign after the file owner completes
5. After ALL sub-agents complete, run a final full-project `pnpm typecheck` and `pnpm test` to catch integration issues
6. Report: each agent's files changed + typecheck result, then final integration result
