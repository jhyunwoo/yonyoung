import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  shouldRunFileUploadFlow,
  uniqueText,
} from "./helpers";

test.describe("activities crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("create, update, delete activity with detail image and upload/url flows", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generation = await ensureGeneration(request, e2ePrefix);
    const runFileUploadFlow = await shouldRunFileUploadFlow(request);
    const title = uniqueText(e2ePrefix, "activity");
    const updatedTitle = `${title}-updated`;

    await page.goto("/admin/activities");

    await page.getByTestId("activity-create-title").fill(title);
    await page
      .getByTestId("activity-create-description")
      .fill(`${e2ePrefix} activity description`);
    await page.getByTestId("activity-create-date").fill("2030-03-01");
    await page.getByTestId("activity-create-generation-id").selectOption(generation.id);
    await page
      .getByTestId("activity-create-cover-url")
      .fill(`https://example.com/${e2ePrefix}/activity-cover-url.jpg`);
    await page.getByTestId("activity-create-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="activity-row-"]', {
      hasText: title,
    });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(createdRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    await page.getByTestId("activity-edit-title").fill(updatedTitle);
    await page.getByTestId("activity-edit-description").fill(`${e2ePrefix} activity edited`);
    await page.getByTestId("activity-edit-date").fill("2030-03-15");
    await page.getByTestId("activity-edit-generation-id").selectOption(generation.id);
    if (runFileUploadFlow) {
      await page.getByTestId("activity-edit-cover-mode-file").check();
      await page.getByTestId("activity-edit-cover-file").setInputFiles(sampleImagePath);
    } else {
      await page.getByTestId("activity-edit-cover-mode-url").check();
      await page
        .getByTestId("activity-edit-cover-url")
        .fill(`https://example.com/${e2ePrefix}/activity-cover-updated-url.jpg`);
    }
    await page.getByTestId("activity-edit-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("수정");

    const updatedRow = page.locator('[data-testid^="activity-row-"]', {
      hasText: updatedTitle,
    });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(updatedRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    await page.getByTestId("activity-detail-create-image-mode-url").check();
    await page
      .getByTestId("activity-detail-create-image-url")
      .fill(`https://example.com/${e2ePrefix}/activity-detail-url.jpg`);
    await page.getByTestId("activity-detail-create-sort-order").fill("0");
    await page.getByTestId("activity-detail-create-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("추가");

    const detailRow = page.locator('[data-testid^="activity-detail-row-"]').first();
    await expect(detailRow).toBeVisible();
    await detailRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(detailRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    if (runFileUploadFlow) {
      await page.getByTestId("activity-detail-edit-image-mode-file").check();
      await page.getByTestId("activity-detail-edit-image-file").setInputFiles(sampleImagePath);
    } else {
      await page.getByTestId("activity-detail-edit-image-mode-url").check();
      await page
        .getByTestId("activity-detail-edit-image-url")
        .fill(`https://example.com/${e2ePrefix}/activity-detail-updated-url.jpg`);
    }
    await page.getByTestId("activity-detail-edit-sort-order").fill("1");
    await page.getByTestId("activity-detail-edit-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("수정");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("activity-detail-delete-button").click();

    await expect(page.getByTestId("activities-success")).toContainText("삭제");

    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("activity-delete-button").click();

    await expect(page.getByTestId("activities-success")).toContainText("삭제");

    await cleanupByPrefix(request, e2ePrefix);
  });
});
