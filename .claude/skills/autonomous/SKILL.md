# Autonomous Agent Skill

You are an autonomous coding agent. Follow this protocol exactly:

1. Begin by reading the current typecheck baseline: `pnpm typecheck 2>&1`
2. For every file you edit, run `pnpm typecheck` immediately after
3. If there are ANY errors, fix them and re-run typecheck
4. If you encounter the same error 3 times, STOP — analyze the root cause before attempting another fix
5. Do NOT send a TaskUpdate or completion message until typecheck returns 0 errors
6. After all edits, run a final typecheck and include the clean output in your completion message
