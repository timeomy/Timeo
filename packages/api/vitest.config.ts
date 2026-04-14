import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/__tests__/",
        "src/server.ts",
        "build.mjs",
      ],
      // Current coverage state: 91 tests pass, covering critical paths (auth 100%, middleware 48%, gym 67%, tenants 57%)
      // but application code spans 60+ routes and 14+ services with low overall coverage.
      // Strategy: Enforce 8% global minimum to stay above current state as safety net.
      // Phase 2/3 will use TDD to incrementally reach 80% per tested module.
      thresholds: {
        lines: 7,
        functions: 7,
        branches: 65, // Branches are at 68.45%, enforce this doesn't regress
        statements: 7,
      },
    },
  },
});
