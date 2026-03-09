# E2E Test Generation Skill

## Steps

1. Analyze all Hono API routes in `packages/api/src/routes/` and Next.js pages in `apps/web/src/app/`
2. For each route and page, generate a Playwright E2E test covering:
   - Happy path
   - One error case
   - Auth setup using test credentials from `.env.example`
3. Run each test: `pnpm exec playwright test [file] --reporter=list`
   - Fix failures by adjusting the test
   - If the app code is wrong, file a `// BUG:` comment in the test instead of forcing it to pass
4. After all tests pass, create `.github/workflows/e2e-gate.yml` that:
   - Runs on every PR to `main`
   - Blocks merge on failure
5. Verify workflow syntax with `actionlint` if available

## Output Summary

Report:
- Tests created (count + file paths)
- Tests passing
- Tests that revealed actual bugs (`// BUG:` comments)
- Final `e2e-gate.yml` contents
