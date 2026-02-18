import { test, expect } from "./fixtures";
import { ensureAdminSession } from "./helpers";

test.describe("admin shell", () => {
  test("sidebar toggle and navigation", async ({ page }) => {
    await ensureAdminSession(page);
    await page.goto("/admin");

    await expect(page.getByTestId("admin-shell")).toBeVisible();
    await expect(page.getByTestId("admin-sidebar")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/\d+$/);

    const toggle = page.getByTestId("admin-sidebar-toggle");
    await toggle.click();

    const collapsedValue = await page.evaluate(() =>
      window.localStorage.getItem("admin.sidebar.collapsed"),
    );
    await expect(collapsedValue).toBe("1");

    await page.reload();
    const collapsedValueAfterReload = await page.evaluate(() =>
      window.localStorage.getItem("admin.sidebar.collapsed"),
    );
    await expect(collapsedValueAfterReload).toBe("1");

    await page.getByTestId("admin-sidebar-toggle").click();
    const generationSelect = page.getByTestId("admin-generation-select");
    await expect(generationSelect).toBeVisible();
    const selectedSortOrder = await generationSelect.inputValue();
    expect(selectedSortOrder).not.toBe("");

    const wasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    const shellBackgroundBefore = await page
      .getByTestId("admin-shell")
      .evaluate((element) => window.getComputedStyle(element).backgroundColor);
    await page.getByTestId("admin-theme-toggle").click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark")),
      )
      .toBe(!wasDark);
    const shellBackgroundAfter = await page
      .getByTestId("admin-shell")
      .evaluate((element) => window.getComputedStyle(element).backgroundColor);
    expect(shellBackgroundAfter).not.toBe(shellBackgroundBefore);
    const storedTheme = await page.evaluate(() => window.localStorage.getItem("theme"));
    await expect(storedTheme).toBe(!wasDark ? "dark" : "light");

    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark")),
      )
      .toBe(!wasDark);

    await page.getByTestId("admin-nav-generation-settings").click();
    await expect(page).toHaveURL(/\/admin\/generations$/);
    await expect(page.getByTestId("generations-page")).toBeVisible();

    await page.goto(`/admin/${selectedSortOrder}`);
    await expect(page).toHaveURL(/\/admin\/\d+$/);
    const activeSortOrder =
      page.url().match(/\/admin\/(\d+)/)?.[1] ?? selectedSortOrder;

    const routes = [
      { testId: "admin-nav-act", path: "activities", pageTestId: "activities-page" },
      { testId: "admin-nav-sup", path: "supporters", pageTestId: "supporters-page" },
      { testId: "admin-nav-exh", path: "exhibitions", pageTestId: "exhibitions-page" },
      { testId: "admin-nav-lnk", path: "linktree", pageTestId: "linktree-page" },
      { testId: "admin-nav-usr", path: "users", pageTestId: "users-page" },
    ] as const;

    for (const route of routes) {
      const navLink = page.getByTestId(route.testId);
      await expect(navLink).toHaveAttribute(
        "href",
        `/admin/${activeSortOrder}/${route.path}`,
      );
      await navLink.click();
      await expect(
        page,
      ).toHaveURL(new RegExp(`/admin/${activeSortOrder}/${route.path}$`));
      await expect(page.getByTestId(route.pageTestId)).toBeVisible();
    }

  });
});
