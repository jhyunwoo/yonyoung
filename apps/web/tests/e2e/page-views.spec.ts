import { expect, test } from "@playwright/test";

test.describe("page view tracking", () => {
  test("홈 방문 시 page view API가 호출된다", async ({ page }) => {
    let pageViewCalled = false;
    let entryFlag: boolean | undefined;

    await page.route("**/api/public/page-views", async (route) => {
      const body = route.request().postDataJSON() as {
        pageType?: string;
        resourceId?: string;
        entry?: boolean;
      } | null;
      if (body?.pageType === "home") {
        pageViewCalled = true;
        entryFlag = body.entry;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect.poll(() => pageViewCalled).toBe(true);
    // 주소창으로 직접 연 첫 페이지뷰는 진입으로 보낸다.
    expect(entryFlag).toBe(true);
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
    await expect
      .poll(() => capturedBody)
      .toMatchObject({
        pageType: "activity",
        resourceId: "act-1",
      });
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
    await expect
      .poll(() => capturedBody)
      .toMatchObject({
        pageType: "exhibition",
        resourceId: "exh-1",
      });
  });
});
