import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  shouldRunFileUploadFlow,
  uniqueText,
} from "./helpers";

test.describe("exhibitions crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("create, update, delete exhibition with detail image and upload/url flows", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generation = await ensureGeneration(request, e2ePrefix);
    const runFileUploadFlow = await shouldRunFileUploadFlow(request);
    const title = uniqueText(e2ePrefix, "exhibition");
    const updatedTitle = `${title}-updated`;

    await page.goto("/admin/exhibitions");

    await page.getByTestId("exhibition-create-title").fill(title);
    await page.getByTestId("exhibition-create-start-date").fill("2031-01-10");
    await page.getByTestId("exhibition-create-end-date").fill("2031-01-20");
    await page.getByTestId("exhibition-create-generation-id").selectOption(generation.id);
    await page.getByTestId("exhibition-create-place").fill(`${e2ePrefix} hall`);
    await page
      .getByTestId("exhibition-create-description")
      .fill(`${e2ePrefix} exhibition description`);
    await page
      .getByTestId("exhibition-create-cover-url")
      .fill(`https://example.com/${e2ePrefix}/exhibition-cover-url.jpg`);
    await page.getByTestId("exhibition-create-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="exhibition-row-"]', {
      hasText: title,
    });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(createdRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    await page.getByTestId("exhibition-edit-title").fill(updatedTitle);
    await page.getByTestId("exhibition-edit-start-date").fill("2031-02-01");
    await page.getByTestId("exhibition-edit-end-date").fill("2031-02-15");
    await page.getByTestId("exhibition-edit-generation-id").selectOption(generation.id);
    await page.getByTestId("exhibition-edit-place").fill(`${e2ePrefix} gallery`);
    await page
      .getByTestId("exhibition-edit-description")
      .fill(`${e2ePrefix} exhibition updated description`);
    if (runFileUploadFlow) {
      await page.getByTestId("exhibition-edit-cover-mode-file").check();
      await page.getByTestId("exhibition-edit-cover-file").setInputFiles(sampleImagePath);
    } else {
      await page.getByTestId("exhibition-edit-cover-mode-url").check();
      await page
        .getByTestId("exhibition-edit-cover-url")
        .fill(`https://example.com/${e2ePrefix}/exhibition-cover-updated-url.jpg`);
    }
    await page.getByTestId("exhibition-edit-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("수정");

    const updatedRow = page.locator('[data-testid^="exhibition-row-"]', {
      hasText: updatedTitle,
    });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(updatedRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    await page.getByTestId("exhibition-detail-create-image-mode-url").check();
    await page
      .getByTestId("exhibition-detail-create-image-url")
      .fill(`https://example.com/${e2ePrefix}/exhibition-detail-url.jpg`);
    await page.getByTestId("exhibition-detail-create-sort-order").fill("0");
    await page.getByTestId("exhibition-detail-create-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("추가");

    const detailRow = page.locator('[data-testid^="exhibition-detail-row-"]').first();
    await expect(detailRow).toBeVisible();
    await detailRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(detailRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    if (runFileUploadFlow) {
      await page.getByTestId("exhibition-detail-edit-image-mode-file").check();
      await page.getByTestId("exhibition-detail-edit-image-file").setInputFiles(sampleImagePath);
    } else {
      await page.getByTestId("exhibition-detail-edit-image-mode-url").check();
      await page
        .getByTestId("exhibition-detail-edit-image-url")
        .fill(`https://example.com/${e2ePrefix}/exhibition-detail-updated-url.jpg`);
    }
    await page.getByTestId("exhibition-detail-edit-sort-order").fill("1");
    await page.getByTestId("exhibition-detail-edit-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("수정");

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("exhibition-detail-delete-button").click();

    await expect(page.locator('[data-testid^="exhibition-detail-row-"]')).toHaveCount(0);

    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("exhibition-delete-button").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("삭제");

    await cleanupByPrefix(request, e2ePrefix);
  });
});
