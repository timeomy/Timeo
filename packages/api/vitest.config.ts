import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@timeo/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@timeo/db": path.resolve(__dirname, "../../packages/db/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    testTimeout: 10_000,
    unstubGlobals: true,
  },
});
