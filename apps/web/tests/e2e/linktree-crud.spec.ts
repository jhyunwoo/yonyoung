import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  uniqueText,
} from "./helpers";

test.describe("linktree crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("create, update, delete linktree and item", async ({ page, request, e2ePrefix }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const name = uniqueText(e2ePrefix, "linktree");
    const updatedName = `${name}-updated`;
    const itemName = uniqueText(e2ePrefix, "item");
    const updatedItemName = `${itemName}-updated`;

    await page.goto("/admin/linktree");

    await page.getByTestId("linktree-create-name").fill(name);
    await page.getByTestId("linktree-create-submit").click();

    await expect(page.getByTestId("linktree-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="linktree-row-"]', {
      hasText: name,
    });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: /선택|선택됨/ }).click();

    await page.getByTestId("linktree-edit-name").fill(updatedName);
    await page.getByTestId("linktree-edit-submit").click();

    await expect(page.getByTestId("linktree-success")).toContainText("수정");

    const updatedRow = page.locator('[data-testid^="linktree-row-"]', {
      hasText: e2ePrefix,
    });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();

    await page.getByTestId("linktree-item-create-name").fill(itemName);
    await page
      .getByTestId("linktree-item-create-link")
      .fill(`https://example.com/${e2ePrefix}/linktree-item`);
    await page.getByTestId("linktree-item-create-submit").click();

    await expect(page.getByTestId("linktree-success")).toContainText("추가");

    const itemRow = page.locator('[data-testid^="linktree-item-row-"]', {
      hasText: itemName,
    });
    await expect(itemRow).toBeVisible();
    await itemRow.getByRole("button", { name: /선택|선택됨/ }).click();

    await page.getByTestId("linktree-item-edit-name").fill(updatedItemName);
    await page
      .getByTestId("linktree-item-edit-link")
      .fill(`https://example.com/${e2ePrefix}/linktree-item-updated`);
    await page.getByTestId("linktree-item-edit-submit").click();

    await expect(page.getByTestId("linktree-success")).toContainText("수정");

    const updatedItemRow = page.locator('[data-testid^="linktree-item-row-"]', {
      hasText: e2ePrefix,
    });
    await expect(updatedItemRow).toBeVisible();
    await updatedItemRow.getByRole("button", { name: /선택|선택됨/ }).click();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("linktree-item-delete-button").click();

    await expect(updatedItemRow).toHaveCount(0);

    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("linktree-delete-button").click();

    await expect(page.getByTestId("linktree-success")).toContainText("삭제");

    await cleanupByPrefix(request, e2ePrefix);
  });
});
