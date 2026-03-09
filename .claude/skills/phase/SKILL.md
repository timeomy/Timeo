# Phase Execution Skill

For each task in the phase:

1. Read the current source files relevant to the task before writing any code
2. Verify all types, field names, and import aliases against the actual codebase — never assume
3. Implement the task
4. Run `pnpm typecheck` and fix ALL errors before moving to the next task
5. Only mark a task done when typecheck shows 0 errors

After all tasks are complete, run a final `pnpm typecheck` from the root and report:
- Tasks completed
- Files created or modified
- Final typecheck result
