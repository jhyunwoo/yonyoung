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
    const readDrawerQuery = async () =>
      page.evaluate(() => {
        const params = new URL(window.location.href).searchParams;
        return {
          panel: params.get("panel"),
          id: params.get("id"),
        };
      });

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
    const userRowTestId = await userRow.getAttribute("data-testid");
    if (!userRowTestId) {
      throw new Error("target user row test id is missing");
    }
    const targetUserId = userRowTestId.replace("user-row-", "");

    await userRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(targetUserId);
    await expect(page.getByTestId("user-drawer")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("user-drawer")).toBeVisible();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(targetUserId);
    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);

    await page.goto(`/admin/users?panel=edit&id=${targetUserId}`);
    await expect(page.getByTestId("user-drawer")).toBeVisible();
    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);

    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);

    const updatedName = uniqueText(e2ePrefix, "user-updated");
    await page.getByTestId("user-edit-name").fill(updatedName);
    await page.getByTestId("user-edit-nickname").fill(`${e2ePrefix}-nick`);
    await page.getByTestId("user-edit-role").selectOption("regular_member");
    await page.getByTestId("user-edit-generation-id").selectOption(generation.id);
    await page.getByTestId("user-edit-image-file").setInputFiles(sampleImagePath);
    await page.getByTestId("user-edit-submit").click();

    await expect(page.getByTestId("users-success")).toContainText("수정");

    await page.getByTestId("user-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("users-success")).toContainText("삭제");
    await page.getByTestId("users-reload-button").click();
    await expect(
      page.locator('[data-testid^="user-row-"]', {
        hasText: tempUser.email,
      }),
    ).toHaveCount(0);
    await expect.poll(async () => (await readDrawerQuery()).panel).toBeNull();
    await expect.poll(async () => (await readDrawerQuery()).id).toBeNull();

    await cleanupByPrefix(request, e2ePrefix);
  });
});
