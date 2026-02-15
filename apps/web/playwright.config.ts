import { defineConfig } from "@playwright/test";
import { loadE2eEnv, readE2eEnv } from "./tests/e2e/env";

loadE2eEnv();
const baseURL = readE2eEnv("E2E_BASE_URL", "http://localhost:3000");

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
  use: {
    baseURL,
    storageState: "tests/e2e/.auth/admin.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
