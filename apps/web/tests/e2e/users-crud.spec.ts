import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  shouldRunFileUploadFlow,
  signUpTemporaryUser,
  uniqueText,
} from "./helpers";

test.describe("users crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("list/get/update/delete user with file upload flow", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generation = await ensureGeneration(request, e2ePrefix);
    const runFileUploadFlow = await shouldRunFileUploadFlow(request, page);
    test.skip(!runFileUploadFlow, "파일 업로드 가능한 환경에서만 실행합니다.");
    const tempUser = await signUpTemporaryUser(e2ePrefix);

    await page.goto("/admin/users");
    await page.getByTestId("users-reload-button").click();

    const userRow = page.locator('[data-testid^="user-row-"]', {
      hasText: tempUser.email,
    });
    await expect(userRow).toBeVisible();

    await userRow.getByRole("button", { name: /선택|선택됨/ }).click();

    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);

    const updatedName = uniqueText(e2ePrefix, "user-updated");
    await page.getByTestId("user-edit-name").fill(updatedName);
    await page.getByTestId("user-edit-nickname").fill(`${e2ePrefix}-nick`);
    await page.getByTestId("user-edit-role").selectOption("regular_member");
    await page.getByTestId("user-edit-generation-id").selectOption(generation.id);
    await page.getByTestId("user-edit-image-file").setInputFiles(sampleImagePath);
    await page.getByTestId("user-edit-submit").click();

    await expect(page.getByTestId("users-success")).toContainText("수정");

    await userRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await page.getByTestId("user-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("users-success")).toContainText("삭제");
    await page.getByTestId("users-reload-button").click();
    await expect(
      page.locator('[data-testid^="user-row-"]', {
        hasText: tempUser.email,
      }),
    ).toHaveCount(0);

    await cleanupByPrefix(request, e2ePrefix);
  });
});
