import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/purity": "error",
      "react-hooks/refs": "error",
    },
  },
  // 타입 정보를 쓰는 검사. 타입 체커가 놓치는 Promise 오용과 누락된 분기를 잡는다.
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        // 기본 tsconfig 는 tests/ 를 제외하지만 테스트 코드에도 같은 검사가 필요하다.
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/no-misused-promises": "error",
      // default 절이 모든 나머지를 처리하는 문자열 switch 까지 강제하지는 않는다.
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  // 아키텍처 의존 방향을 CI 에서 강제한다.
  //   app → features → shared,  server → shared
  // 코드를 먼저 올바른 위치로 옮긴 뒤 켠 규칙이라 예외 목록이 없다.
  {
    files: ["shared/**/*.ts", "shared/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/features/*"],
              message:
                "shared 는 도메인이 없는 최하위 계층이다. app/features 를 import 하면 순환이 생긴다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["features/**/*.ts", "features/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*"],
              message:
                "feature 는 라우트를 몰라야 한다. 화면에 필요한 것은 app 쪽에서 조립한다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["server/**/*.ts", "server/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "@/features/*"],
              message:
                "server 는 요청 처리 경계다. app/features 를 import 하면 의존이 뒤집힌다.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".cache/**",
    ".tmp/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
