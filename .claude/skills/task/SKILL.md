# Task Execution Skill

1. Read the full task spec carefully before writing any code
2. Verify all field names, types, and import aliases against the actual codebase (check tsconfig.json paths)
3. Implement all sub-tasks
4. Run `pnpm typecheck` and fix ALL errors to reach 0
5. Run `pnpm test` if tests exist for modified areas
6. Report completion with summary of files changed and typecheck result

Never assume API shapes — always read the current source of truth.
