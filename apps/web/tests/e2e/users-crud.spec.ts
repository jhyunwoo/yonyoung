import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  installPresignedUploadMock,
  shouldUseUploadMock,
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
    let uploadMock: Awaited<ReturnType<typeof installPresignedUploadMock>> | null = null;
    if (shouldUseUploadMock()) {
      uploadMock = await installPresignedUploadMock(page, {
        routes: [
          {
            key: "user-profile",
            presignPath: "/users/presign/profile",
            resource: "users",
            slot: "profile",
            requiredHeaders: {
              "Content-Type": "image/png",
              "x-amz-meta-source": "e2e-user-profile",
            },
            uploadDelayMs: 120,
          },
        ],
      });
    } else {
      const runFileUploadFlow = await shouldRunFileUploadFlow(request, page);
      test.skip(!runFileUploadFlow, "파일 업로드 가능한 환경에서만 실행합니다.");
    }
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

    await page.getByTestId(`user-inline-toggle-${targetUserId}`).click();
    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);
    await expect(page.getByTestId("user-edit-form")).toBeVisible();

    await page.reload();
    await page.getByTestId(`user-inline-toggle-${targetUserId}`).click();
    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);

    const updatedName = uniqueText(e2ePrefix, "user-updated");
    await page.getByTestId("user-edit-name").fill(updatedName);
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

    if (uploadMock) {
      const profilePresignPayloads = uploadMock.getPresignPayloads("user-profile");
      expect(profilePresignPayloads[0]).toMatchObject({
        fileName: "test-image.png",
        contentType: "image/png",
      });
      expect(uploadMock.getUploadCount("user-profile")).toBe(1);

      const firstUpload = uploadMock.getUploadRequests("user-profile")[0];
      expect(firstUpload?.headers["x-amz-meta-source"]).toBe("e2e-user-profile");
    }

    await cleanupByPrefix(request, e2ePrefix);
  });
});
