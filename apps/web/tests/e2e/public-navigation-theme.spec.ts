import { test, expect } from "./fixtures";

test.describe("public navigation", () => {
  test("데스크톱 헤더 네비게이션과 로고 이동이 정상 동작한다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });

    await page.goto("/");
    await expect(page.getByTestId("public-nav-desktop")).toBeVisible();

    const desktopAboutLink = page.getByTestId("public-nav-desktop-about");
    const desktopArchiveLink = page.getByTestId("public-nav-desktop-archive");
    const desktopLinktreeLink = page.getByTestId("public-nav-desktop-linktree");
    const desktopDonateLink = page.getByTestId("public-nav-desktop-donate");

    await expect(desktopAboutLink).toHaveAttribute("href", "/about");
    await expect(desktopArchiveLink).toHaveAttribute("href", "/archive");
    await expect(desktopLinktreeLink).toHaveAttribute("href", "/linktree");
    await expect(desktopDonateLink).toHaveAttribute("href", "/donate");

    await desktopArchiveLink.click();
    await expect(page).toHaveURL(/\/archive\/records$/);

    await page.getByTestId("public-logo-link").click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("모바일 메뉴 토글과 메뉴 이동이 정상 동작한다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator('[data-testid="public-nav-toggle"]:visible')).toBeVisible();
    await expect(page.getByTestId("public-nav-mobile")).toHaveCount(0);

    await page.getByTestId("public-nav-toggle").click();
    await expect(page.getByTestId("public-nav-mobile")).toBeVisible();
    await expect(page.getByTestId("public-nav-mobile-about")).toHaveAttribute(
      "href",
      "/about",
    );

    await page.getByTestId("public-nav-mobile-about").click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByTestId("public-nav-mobile")).toHaveCount(0);
  });

  test("관리자 모드 토글 상태가 로컬스토리지에 저장된다", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.removeItem("isAdminMode");
    });
    await page.reload();

    const adminToggle = page.getByRole("button", { name: "관리자 모드 토글" });
    await expect(adminToggle).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("isAdminMode")))
      .toBeNull();

    await adminToggle.click();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("isAdminMode")))
      .toBe("true");

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("isAdminMode")))
      .toBe("true");

    await page.getByRole("button", { name: "관리자 모드 토글" }).click();
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("isAdminMode")))
      .toBe("false");
  });
});
