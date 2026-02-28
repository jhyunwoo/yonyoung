import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  pickExistingGeneration,
  provisionRoleUser,
  signInWithEmailPassword,
} from "./helpers";

const toGenerationPath = (name: string): string => `/dashboard/${encodeURIComponent(name.trim())}`;

test.describe("auth flow", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("비인증 사용자는 대시보드 접근 시 로그인 페이지로 이동한다", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/auth\/sign-in(?:\?.*)?$/);
    await expect(
      page.getByRole("heading", { name: "연영회 Dashboard 로그인" }),
    ).toBeVisible();
  });

  test("세션 복구 및 unverified 권한 제한이 동작한다", async ({ page, e2ePrefix }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await ensureAdminSession(page);
    const generation = await pickExistingGeneration(page.request);
    const unverifiedUser = await provisionRoleUser(page.request, {
      prefix: e2ePrefix,
      role: "unverified",
      generationId: generation.id,
    });

    await page.context().clearCookies();
    await signInWithEmailPassword(page, {
      email: unverifiedUser.email,
      password: unverifiedUser.password,
      expectedRole: "unverified",
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/pending-approval(?:\?.*)?$/);
    const pendingApprovalPage = page.getByTestId("auth-pending-approval-page");
    await expect(pendingApprovalPage).toBeVisible();
    await expect(page.getByTestId("public-header")).toBeVisible();

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const [headerBox, cardBox, sectionBox] = await Promise.all([
      page.getByTestId("public-header").boundingBox(),
      pendingApprovalPage.locator(":scope > div").first().boundingBox(),
      pendingApprovalPage.boundingBox(),
    ]);

    expect(headerBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(sectionBox).not.toBeNull();

    if (viewport && headerBox && cardBox && sectionBox) {
      const layoutTolerancePx = 8;
      expect(cardBox.y).toBeGreaterThanOrEqual(
        headerBox.y + headerBox.height - layoutTolerancePx,
      );
      expect(sectionBox.height).toBeGreaterThanOrEqual(viewport.height - headerBox.height - 1);
    }

    const generationPath = toGenerationPath(generation.name);
    await page.goto(`${generationPath}/activities/new`);
    await expect(page).toHaveURL(/\/auth\/pending-approval(?:\?.*)?$/);
  });
});
