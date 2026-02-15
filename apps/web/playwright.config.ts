import { defineConfig } from "@playwright/test";
import {
  loadE2eEnv,
  readE2eEnv,
  readE2eSuiteMode,
} from "./tests/e2e/env";

loadE2eEnv();
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

const smokeTestMatches = [
  "**/public-home.spec.ts",
  "**/auth-flow.spec.ts",
  "**/admin-shell.spec.ts",
  "**/generations-crud.spec.ts",
  "**/linktree-crud.spec.ts",
];

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: {
    timeout: 12_000,
  },
  globalSetup: "./tests/e2e/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: [
    {
      command: `pnpm --filter api exec wrangler dev --port ${apiPort}`,
      url: `${apiURL}/message`,
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
            name: "full",
            testMatch: "**/*.spec.ts",
          },
        ]
      : [
          {
            name: "smoke",
            testMatch: smokeTestMatches,
          },
        ],
});
