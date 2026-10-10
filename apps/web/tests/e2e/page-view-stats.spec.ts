import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { assertNoHorizontalOverflow } from "./support/overflow-check";
import { setMockSession } from "./support/session";
import { resetMockState } from "./support/state-assert";
import { assertReadable, setTheme } from "./support/theme-check";

test.describe("방문 통계 화면", () => {
  test.beforeEach(async ({ context, request }, testInfo) => {
    const namespace = `${testInfo.project.name}-w${testInfo.parallelIndex}-page-view-stats`;
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "member", namespace });
  });

  test("프리셋을 고르면 URL과 API 요청 기간이 바뀐다", async ({ page }) => {
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "방문 통계" })).toBeVisible();
    await expect(page.getByText("이전 기간 대비").first()).toBeVisible();

    await page.getByTestId("btn-stats-period-6m").click();
    await expect(page).toHaveURL(/range=6m/);
    await expect(page.getByTestId("btn-stats-period-6m")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByTestId("btn-stats-granularity-month").click();
    await expect(page).toHaveURL(/range=6m&granularity=month/);
    await expect(page.getByText("월 단위, 빈 날은 0으로 표시")).toBeVisible();
  });

  test("직접 지정한 기간을 적용하고 잘못된 기간은 막는다", async ({ page }) => {
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });
    await page.getByTestId("btn-stats-period-custom").click();

    await page.getByTestId("input-stats-from").fill("2026-03-10");
    await page.getByTestId("input-stats-to").fill("2026-03-01");
    await page.getByTestId("btn-stats-custom-apply").click();
    await expect(page.getByTestId("stats-custom-range-error")).toHaveText(
      "시작일은 종료일보다 늦을 수 없습니다.",
    );
    await expect(page).not.toHaveURL(/from=/);

    await page.getByTestId("input-stats-to").fill("2026-03-31");
    await page.getByTestId("btn-stats-custom-apply").click();
    await expect(page).toHaveURL(/from=2026-03-10&to=2026-03-31/);
    await expect(page.getByText(/2026-03-10 ~ 2026-03-31/)).toBeVisible();
  });

  test("추이를 CSV로 내려받는다", async ({ page }) => {
    await page.goto("/dashboard/stats?from=2026-05-01&to=2026-05-03", {
      waitUntil: "domcontentloaded",
    });

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("btn-stats-csv").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("page-views_2026-05-01_2026-05-03_day.csv");
    const content = await readFile((await download.path())!, "utf8");
    expect(content).toContain("2026-05-01,110,90");
  });

  test("모바일에서 기간·집계 단위 버튼은 44px 이상 터치 영역을 가진다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "터치 기기 기준 검사");
    await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });

    for (const testId of ["btn-stats-period-7d", "btn-stats-granularity-day"]) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${theme} 테마에서 대비와 가로 넘침이 없다`, async ({ page }) => {
      await page.goto("/dashboard/stats", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      await expect(page.getByRole("heading", { name: "유입 경로" })).toBeVisible();
      await assertNoHorizontalOverflow(page, `stats-${theme}`);
      await assertReadable(page);
    });
  }
});
