import { defineConfig } from "@playwright/test";
import {
  loadE2eEnv,
  readE2eEnv,
  readE2eUploadMode,
  readE2eSuiteMode,
} from "./tests/e2e/env";

loadE2eEnv();
if (!process.env.E2E_UPLOAD_MODE) {
  process.env.E2E_UPLOAD_MODE = "real";
}

const uploadMode = readE2eUploadMode();
if (uploadMode !== "real") {
  throw new Error(
    "E2E_UPLOAD_MODE=real 설정이 필요합니다. 파일 업로드 E2E는 real 모드만 지원합니다.",
  );
}

const baseURL = readE2eEnv("E2E_BASE_URL", "http://localhost:3000");
const apiURL = readE2eEnv("E2E_API_URL", "http://localhost:8787");

const resolvePort = (urlValue: string, fallback: number): number => {
  try {
    const parsed = new URL(urlValue);
    if (parsed.port) {
      return Number.parseInt(parsed.port, 10);
    }
    return parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return fallback;
  }
};

const webPort = resolvePort(baseURL, 3000);
const apiPort = resolvePort(apiURL, 8787);
const suiteMode = readE2eSuiteMode();

const publicTestMatches = [
  "**/public-home.spec.ts",
  "**/public-navigation-theme.spec.ts",
  "**/public-pages-content.spec.ts",
];

const desktopSmokeTestMatches = [
  "**/public-home.spec.ts",
  "**/public-navigation-theme.spec.ts",
  "**/public-pages-content.spec.ts",
  "**/auth-flow.spec.ts",
  "**/admin-shell.spec.ts",
  "**/generations-crud.spec.ts",
];

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: suiteMode === "full" ? 1 : 0,
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: [
    {
      command: `pnpm --filter api run dev -- --port ${apiPort}`,
      url: `${apiURL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: `pnpm exec next dev --port ${webPort}`,
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  use: {
    baseURL,
    storageState: "tests/e2e/.auth/admin.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects:
    suiteMode === "full"
      ? [
          {
            name: "desktop-full",
            testMatch: "**/*.spec.ts",
          },
          {
            name: "mobile-full",
            testMatch: publicTestMatches,
            use: {
              viewport: { width: 390, height: 844 },
              isMobile: true,
              hasTouch: true,
            },
          },
        ]
      : [
          {
            name: "desktop-smoke",
            testMatch: desktopSmokeTestMatches,
          },
          {
            name: "mobile-smoke",
            testMatch: publicTestMatches,
            use: {
              viewport: { width: 390, height: 844 },
              isMobile: true,
              hasTouch: true,
            },
          },
        ],
});
