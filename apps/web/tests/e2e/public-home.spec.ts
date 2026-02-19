import { test, expect } from "./fixtures";

test.describe("public home", () => {
  test("홈 UI 구성/텍스트/CTA/핵심 섹션 노출이 정상 동작한다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("public-header")).toBeVisible();
    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(page.getByTestId("public-footer")).toBeVisible();
    await expect(
      page.getByTestId("home-hero").getByRole("heading", { name: "연영회" }),
    ).toBeVisible();

    await expect(page.getByTestId("home-hero-exhibition-meta")).toContainText(
      "Latest Exhibition",
    );
    await expect(page.getByTestId("home-activities-grid")).toBeVisible();
    await expect(page.getByTestId("home-supporters-grid")).toBeVisible();
    await expect(page.getByTestId("home-quicklinks-grid")).toBeVisible();

    await page.getByTestId("home-cta-archive").click();
    await expect(page).toHaveURL(/\/archive\/records$/);
    await expect(page.getByRole("heading", { name: "활동 기록" })).toBeVisible();

    await page.goto("/");
    await page.getByTestId("home-cta-about").click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: "연영회 소개" })).toBeVisible();

    await page.goto("/");
    await page.getByTestId("home-cta-archive-bottom").click();
    await expect(page).toHaveURL(/\/archive\/records$/);
  });
});
