import { test, expect } from "./fixtures";
import { ensureAdminSession } from "./helpers";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test.describe("auth flow", () => {
  test("unauthenticated admin access redirects to sign-in", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    try {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/auth\/sign-in$/);
      await expect(page.getByRole("heading", { name: "관리자 로그인" })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("authenticated admin visiting sign-in is redirected to admin", async ({ page }) => {
    await ensureAdminSession(page);

    await page.goto("/auth/sign-in");
    await expect(page).toHaveURL(/\/admin(?:\/\d+)?(?:\?generation=\d+)?$/);
    await expect(page.getByTestId("admin-shell")).toBeVisible();
  });
});
