---
active: true
iteration: 1
max_iterations: 20
completion_promise: "AUTH_HARDENED"
started_at: "2026-02-26T08:01:56Z"
---

Audit and harden the full Timeo auth flow to production-grade security. You are in /Users/jabez/Timeo (Next.js 14 + Convex + Better Auth monorepo). Auth files: packages/api/convex/betterAuth.ts, packages/auth/src/web/middleware.ts, apps/web/app/(auth)/, apps/web/app/(app)/post-login/page.tsx, packages/api/convex/platform.ts. PHASE 1 - OSS research: WebSearch 'better-auth production security best practices 2025', 'OWASP authentication cheat sheet top requirements', 'NextAuth.js brute force rate limiting production'. Extract top security patterns that production auth implementations use. PHASE 2 - Security audit: Read all auth files. Check for: rate limiting on login/signup/forgot-password, brute force protection, session invalidation on password change, secure cookie flags, CSRF, token expiry, email enumeration prevention, open redirects, JWT expiry/refresh, audit logs for auth events, password policy. Fix all CRITICAL and HIGH issues in-place. PHASE 3 - E2E tests: Check if Playwright is installed in apps/web/package.json. If not, add it. Write apps/web/e2e/auth.spec.ts covering: signup shows verify-email page, signin wrong password shows error, signin unverified email shows error, forgot-password success message, post-login redirect goes to correct route. Run tests, fix failures. PHASE 4 - Deploy: if betterAuth.ts changed run 'cd packages/api && npx convex deploy --yes'. Run 'pnpm --filter @timeo/web typecheck'. Commit everything with 'git add -A && git commit -m feat: auth security hardening + e2e tests'. COMPLETION: When all phases done, typecheck passes, and changes are committed, output <promise>AUTH_HARDENED</promise>
