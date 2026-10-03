import { expect, test } from "@playwright/test";

// Run with NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.invalid/1.
// All SDK traffic is intercepted locally; no real Sentry project is needed.
test("Sentry captures browser errors through the configured CSP", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_SENTRY_DSN, "Requires a Sentry-enabled build");
  const origin = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN!).origin;
  const envelopes: string[] = [];
  await page.route(`${origin}/**`, async (route) => {
    envelopes.push(route.request().postData() ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
      headers: { "access-control-allow-origin": "*" },
    });
  });
  const response = await page.goto("/?token=private-test-query");
  expect(response?.headers()["content-security-policy"]).toContain(origin);
  await expect(page.getByTestId("home-activities-grid")).toBeVisible();
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("sentry-browser-smoke");
    }, 0);
  });
  await expect
    .poll(() => envelopes.some((body) => body.includes("sentry-browser-smoke")))
    .toBe(true);
  const error = envelopes.find((body) => body.includes("sentry-browser-smoke"))!;
  expect(error).not.toContain("private-test-query");
});
