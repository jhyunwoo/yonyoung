import { test, expect } from "./fixtures";
import { cleanupByPrefix, ensureAdminSession, uniqueText } from "./helpers";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";

test.describe("linktree crud", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("그룹/아이템 수정과 삭제가 동작한다", async ({ page, e2ePrefix }) => {
    test.setTimeout(240_000);

    await ensureAdminSession(page);

    const groupName = uniqueText(e2ePrefix, "linktree-group");
    const createGroupResponse = await page.request.post(`${API_BASE_URL}/api/linktree`, {
      data: { name: groupName },
    });
    expect(createGroupResponse.status()).toBe(201);
    const groupBody = (await createGroupResponse.json()) as { data: { id: string } };
    const groupId = groupBody.data.id;

    const itemName = uniqueText(e2ePrefix, "linktree-item");
    const createItemResponse = await page.request.post(
      `${API_BASE_URL}/api/linktree/${groupId}/items`,
      {
        data: {
          name: itemName,
          link: "https://example.com/linktree-item",
        },
      },
    );
    expect(createItemResponse.status()).toBe(201);
    const itemBody = (await createItemResponse.json()) as { data: { id: string } };
    const itemId = itemBody.data.id;

    await page.goto("/dashboard/settings/linktree");
    await page.getByRole("link", { name: groupName }).first().click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/settings/linktree/${groupId}$`));

    await page.getByRole("link", { name: "분류 수정" }).click();
    const updatedGroupName = `${groupName}-updated`;
    await page.getByLabel("분류 이름").fill(updatedGroupName);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/settings/linktree/${groupId}$`), {
      timeout: 30_000,
    });
    await expect(page.getByText(updatedGroupName)).toBeVisible();

    await page.goto(`/dashboard/settings/linktree/${groupId}/items/${itemId}`);
    await page.getByRole("link", { name: "링크 수정" }).click();
    const updatedItemName = `${itemName}-updated`;
    await page.getByLabel("링크 이름").fill(updatedItemName);
    await page.getByLabel("URL").fill("https://example.com/linktree-item-updated");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/settings/linktree/${groupId}/items/${itemId}$`),
      { timeout: 30_000 },
    );
    await expect(page.getByText(updatedItemName)).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "링크 삭제" }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/settings/linktree/${groupId}$`), {
      timeout: 60_000,
    });

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "분류 삭제" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/linktree$/, {
      timeout: 120_000,
    });
  });
});
