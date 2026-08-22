import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

import { boundaryRule, commonIgnores } from "@yonyoung/eslint-config/base";

export default defineConfig([
  globalIgnores(commonIgnores),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    rules: boundaryRule([
      {
        group: [
          "@yonyoung/web",
          "@yonyoung/web/**",
          "@yonyoung/api",
          "@yonyoung/api/**",
          "apps/**",
        ],
        message:
          "Runtime-neutral contracts cannot depend on either application.",
      },
    ]),
  },
]);
