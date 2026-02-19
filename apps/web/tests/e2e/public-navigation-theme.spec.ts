import { test, expect } from "./fixtures";

test.describe("public navigation and theme", () => {
  test("데스크톱 헤더 네비게이션과 로고 이동이 정상 동작한다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });

    await page.goto("/");
    await expect(page.getByTestId("public-nav-desktop")).toBeVisible();

    const desktopHomeLink = page.getByTestId("public-nav-desktop-home");
    const desktopAboutLink = page.getByTestId("public-nav-desktop-about");
    const desktopArchiveLink = page.getByTestId("public-nav-desktop-archive");
    const desktopLinktreeLink = page.getByTestId("public-nav-desktop-linktree");
    const desktopDonateLink = page.getByTestId("public-nav-desktop-donate");

    await expect(desktopHomeLink).toHaveAttribute("href", "/");
    await expect(desktopAboutLink).toHaveAttribute("href", "/about");
    await expect(desktopArchiveLink).toHaveAttribute("href", "/archive/records");
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

  test("테마 선택 상태가 저장되고 새로고침 후 유지된다", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.removeItem("theme");
    });
    await page.reload();

    const visibleThemeSelect = page
      .locator('[data-testid="theme-toggle-select"]:visible')
      .first();
    const initialThemeMode = await visibleThemeSelect.inputValue();
    expect(["light", "dark", "system"]).toContain(initialThemeMode);
    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme ?? "");
    expect(["light", "dark"]).toContain(initialTheme);

    await visibleThemeSelect.selectOption("dark");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? ""))
      .toBe("dark");
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("theme")))
      .toBe("dark");

    await visibleThemeSelect.selectOption("light");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? ""))
      .toBe("light");
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("theme")))
      .toBe("light");

    const expectedSystemTheme = await page.evaluate(() =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );
    await visibleThemeSelect.selectOption("system");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? ""))
      .toBe(expectedSystemTheme);
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem("theme")))
      .toBe("system");

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? ""))
      .toBe(expectedSystemTheme);
    await expect(
      page.locator('[data-testid="theme-toggle-select"]:visible').first(),
    ).toHaveValue("system");
  });
});
