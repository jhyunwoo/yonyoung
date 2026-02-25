import { test, expect } from "./fixtures";
import { cleanupByPrefix, ensureAdminSession, pickExistingGeneration } from "./helpers";

test.describe("admin shell", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("사이드바/설정 서브메뉴/프로필 메뉴/라우팅이 정상 동작한다", async ({ page }) => {
    await ensureAdminSession(page);
    const generation = await pickExistingGeneration(page.request);
    const generationPath = `/dashboard/${encodeURIComponent(generation.name.trim())}`;

    await page.goto(generationPath);
    await expect(page).toHaveURL(new RegExp(`${generationPath}$`));
    await expect(page.getByRole("heading", { name: generation.name })).toBeVisible();

    await page.getByRole("button", { name: "설정" }).click();
    await page.getByRole("link", { name: "Linktree 관리" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/linktree$/);
    await expect(page.getByRole("heading", { name: "Linktree 관리" })).toBeVisible();

    const profileMenuTrigger = page.locator("button[aria-haspopup='menu']").first();
    await expect(profileMenuTrigger).toBeVisible();
    await profileMenuTrigger.click();
    await expect(profileMenuTrigger).toHaveAttribute("aria-expanded", "true");

    const profileLink = page.getByRole("link", { name: "개인 프로필" });
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expect(page.getByRole("heading", { name: "개인 프로필" })).toBeVisible();
  });
});
