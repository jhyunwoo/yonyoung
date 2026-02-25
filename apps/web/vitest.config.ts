import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/admin-api/http.ts",
        "src/lib/admin-api/resources.ts",
        "src/lib/admin-api/upload.ts",
        "src/lib/audit-display.ts",
        "src/lib/auth-shared.ts",
        "src/lib/date-formatters.ts",
        "src/lib/image-upload-state.ts",
        "src/lib/image-utils.ts",
        "src/lib/member-display-name.ts",
        "src/lib/member-role-label.ts",
        "src/lib/opengraph-image.ts",
        "src/lib/public-exhibition.ts",
        "src/lib/rich-text-content.tsx",
        "src/lib/rich-text.ts",
        "src/lib/seo.ts",
        "src/lib/use-image-upload-state.ts",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 80,
      },
    },
  },
});
