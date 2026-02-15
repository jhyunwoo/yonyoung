import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  shouldRunFileUploadFlow,
  uniqueText,
} from "./helpers";

test.describe("supporters crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("create, update, delete supporter with upload/url flows", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const runFileUploadFlow = await shouldRunFileUploadFlow(request, page);
    const name = uniqueText(e2ePrefix, "supporter");
    const updatedName = `${name}-updated`;

    await page.goto("/admin/supporters");

    await page.getByTestId("supporter-create-name").fill(name);
    await page
      .getByTestId("supporter-create-link")
      .fill(`https://example.com/${e2ePrefix}/supporter`);
    await page.getByTestId("supporter-create-expires-at").fill("2032-01-01");
    await page
      .getByTestId("supporter-create-logo-url")
      .fill(`https://example.com/${e2ePrefix}/supporter-logo-url.png`);
    await page.getByTestId("supporter-create-submit").click();

    await expect(page.getByTestId("supporters-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="supporter-row-"]', {
      hasText: name,
    });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: /선택|선택됨/ }).click();

    await page.getByTestId("supporter-edit-name").fill(updatedName);
    await page
      .getByTestId("supporter-edit-link")
      .fill(`https://example.com/${e2ePrefix}/supporter-updated`);
    await page.getByTestId("supporter-edit-expires-at").fill("2032-12-31");
    if (runFileUploadFlow) {
      await page.getByTestId("supporter-edit-logo-mode-file").check();
      await page.getByTestId("supporter-edit-logo-file").setInputFiles(sampleImagePath);
    } else {
      await page.getByTestId("supporter-edit-logo-mode-url").check();
      await page
        .getByTestId("supporter-edit-logo-url")
        .fill(`https://example.com/${e2ePrefix}/supporter-logo-updated-url.png`);
    }
    await page.getByTestId("supporter-edit-submit").click();

    try {
      await expect(page.getByTestId("supporters-success")).toContainText("수정");
    } catch (error) {
      const errorText = await page
        .getByTestId("supporters-error")
        .textContent()
        .catch(() => null);
      if (errorText?.includes("요청 시간이 초과")) {
        await page.getByTestId("supporter-edit-submit").click();
        await expect(page.getByTestId("supporters-success")).toContainText("수정");
      } else {
        throw error;
      }
    }

    const updatedRow = page.locator('[data-testid^="supporter-row-"]', {
      hasText: e2ePrefix,
    });
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("supporter-delete-button").click();

    await expect(page.getByTestId("supporters-success")).toContainText("삭제");

    await cleanupByPrefix(request, e2ePrefix);
  });
});
