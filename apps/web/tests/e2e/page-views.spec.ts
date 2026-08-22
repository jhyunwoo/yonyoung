import { expect, test } from "@playwright/test";

test.describe("page view tracking", () => {
  test("홈 방문 시 page view API가 호출된다", async ({ page }) => {
    let pageViewCalled = false;

    await page.route("**/api/public/page-views", async (route) => {
      const body = route.request().postDataJSON() as {
        pageType?: string;
        resourceId?: string;
      } | null;
      if (body?.pageType === "home") {
        pageViewCalled = true;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    expect(pageViewCalled).toBe(true);
  });

  test("활동 상세 방문 시 activity page view API가 호출된다", async ({ page }) => {
    let capturedBody: { pageType?: string; resourceId?: string } = {};

    await page.route("**/api/public/page-views", async (route) => {
      capturedBody =
        (route.request().postDataJSON() as {
          pageType?: string;
          resourceId?: string;
        } | null) ?? {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/archive/records/act-1", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    expect(capturedBody.pageType).toBe("activity");
    expect(capturedBody.resourceId).toBe("act-1");
  });

  test("전시 상세 방문 시 exhibition page view API가 호출된다", async ({ page }) => {
    let capturedBody: { pageType?: string; resourceId?: string } = {};

    await page.route("**/api/public/page-views", async (route) => {
      capturedBody =
        (route.request().postDataJSON() as {
          pageType?: string;
          resourceId?: string;
        } | null) ?? {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/archive/exhibitions/exh-1", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    expect(capturedBody.pageType).toBe("exhibition");
    expect(capturedBody.resourceId).toBe("exh-1");
  });
});
