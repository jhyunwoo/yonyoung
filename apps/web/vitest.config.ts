import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "next/cache": path.resolve(__dirname, "tests/unit/stubs/next-cache.ts"),
      "server-only": path.resolve(__dirname, "tests/unit/stubs/server-only.ts"),
    },
  },
});
