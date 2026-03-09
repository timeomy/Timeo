# Batch Execution Skill

Complete all sub-tasks in a single session:

1. Work through each sub-task sequentially
2. After each sub-task, run `pnpm typecheck` and fix all errors before proceeding
3. After all sub-tasks are complete, run a final integration check:
   - `pnpm typecheck` from root (0 errors required)
   - `pnpm test` for any areas touched

Report completion with:
- Each sub-task status
- Files created or modified
- Final typecheck and test results
