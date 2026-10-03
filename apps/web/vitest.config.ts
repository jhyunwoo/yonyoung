import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10_000,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.{ts,tsx}", "features/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.{ts,tsx}"],
        },
      },
    ],
    setupFiles: ["tests/setup/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      include: [
        "shared/http/http.ts",
        "server/http/fetch-with-timeout.ts",
        "server/http/hono-client.ts",
        "shared/utils/date-formatters.ts",
        "features/media/rich-text/rich-text.ts",
        "features/media/images/read-image-dimensions.ts",
        "features/media/upload/image-upload-state.ts",
        "features/auth/model/auth-shared.ts",
        "features/dashboard/actions/admin-write-access.ts",
      ],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "next/cache": path.resolve(import.meta.dirname, "tests/unit/stubs/next-cache.ts"),
      "server-only": path.resolve(import.meta.dirname, "tests/unit/stubs/server-only.ts"),
    },
  },
});
