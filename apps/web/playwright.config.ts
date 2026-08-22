import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "dot" : "list",
  outputDir: "test-results/playwright",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm tsx tests/e2e/mock-api/server.ts",
      url: "http://127.0.0.1:4010/__test/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        MOCK_API_PORT: "4010",
      },
    },
    {
      command: "pnpm build && pnpm start --hostname 127.0.0.1 --port 3005",
      url: "http://127.0.0.1:3005",
      reuseExistingServer: !process.env.CI,
      timeout: 420_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        API_BASE_URL: "http://127.0.0.1:4010",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3005",
      },
    },
  ],
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
