import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  pickExistingGeneration,
  provisionRoleUser,
  signInWithEmailPassword,
} from "./helpers";

test.describe("members role profile", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("프로필 이미지 업로드와 역할 기반 UI 제한이 동작한다", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(240_000);

    await ensureAdminSession(page);
    const generation = await pickExistingGeneration(page.request);
    const generationPath = `/dashboard/${encodeURIComponent(generation.name.trim())}`;
    const memberUser = await provisionRoleUser(page.request, {
      prefix: e2ePrefix,
      role: "regular_member",
      generationId: generation.id,
    });
    const targetUser = await provisionRoleUser(page.request, {
      prefix: e2ePrefix,
      role: "regular_member",
      generationId: generation.id,
    });

    await page.goto(`${generationPath}/members/${targetUser.id}`);
    await expect(page.getByRole("button", { name: "수정" })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "수정" }).click();
    await page.locator("input[type='file']").first().setInputFiles(sampleImagePath);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("button", { name: "수정" })).toBeVisible({
      timeout: 30_000,
    });

    await page.context().clearCookies();
    await signInWithEmailPassword(page, {
      email: memberUser.email,
      password: memberUser.password,
      expectedRole: "regular_member",
    });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard(?:$|\/)/, {
      timeout: 60_000,
    });

    await page.goto(`${generationPath}/members/${targetUser.id}`);
    const escapedMemberDetailPath = `${generationPath}/members/${targetUser.id}`.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    await expect(page).toHaveURL(new RegExp(`${escapedMemberDetailPath}$`), {
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "수정" })).toHaveCount(0);
    await expect(page.getByText("제한 정보만 열람할 수 있습니다.")).toBeVisible();

    await page.goto(`${generationPath}/exhibitions`);
    await expect(page.getByRole("link", { name: "전시 추가" })).toHaveCount(0);
  });
});
