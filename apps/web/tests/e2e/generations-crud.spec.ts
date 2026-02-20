import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  signUpTemporaryUser,
  uniqueText,
} from "./helpers";

test.describe("generations crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find(
      (item) => item.type === "e2e-prefix",
    )?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("create, update, member-assign, delete generation", async ({
    page,
    request,
    e2ePrefix,
  }) => {
    test.setTimeout(240_000);

    test
      .info()
      .annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generationName = uniqueText(e2ePrefix, "generation");
    const updatedGenerationName = `${generationName}-updated`;
    const baseSortOrder = String(
      (Date.now() % 1_000_000) * 1_000 + Math.floor(Math.random() * 1_000),
    );
    const tempUser = await signUpTemporaryUser(e2ePrefix);
    const apiBaseUrl = process.env.E2E_API_URL ?? "http://localhost:8787";

    await expect
      .poll(async () => {
        const response = await page.request.get(`${apiBaseUrl}/message`);
        return response.status();
      })
      .toBe(200);

    await page.goto("/admin/generations");
    if (
      (await page.getByRole("heading", { name: "관리자 로그인" }).count()) > 0
    ) {
      await ensureAdminSession(page);
      await page.goto("/admin/generations");
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if ((await page.getByTestId("generations-error").count()) === 0) {
        break;
      }
      await page.getByTestId("generations-reload-button").click();
      await page.waitForTimeout(1_000);
    }

    await expect(page.getByTestId("generations-page")).toBeVisible();
    await expect(page.getByTestId("generations-error")).toHaveCount(0);
    await page.getByTestId("generation-open-create").click();
    await expect(page).toHaveURL(/\/admin\/generations\/create$/);
    await expect(page.getByTestId("generation-drawer")).toBeVisible();

    await page.getByTestId("generation-create-name").fill(generationName);
    await page.getByTestId("generation-create-sort-order").fill(baseSortOrder);
    await page.getByTestId("generation-create-start-date").fill("2030-01-01");
    await page.getByTestId("generation-create-end-date").fill("2030-12-31");
    await page.getByTestId("generation-create-submit").click();

    await expect(page).toHaveURL(/\/admin\/generations\/[0-9a-f-]{36}$/);
    const detailMatch = page
      .url()
      .match(/\/admin\/generations\/([0-9a-f-]{36})$/);
    const createdGenerationId = detailMatch?.[1];
    if (!createdGenerationId) {
      throw new Error("created generation id is missing in detail route");
    }
    await expect(page.getByTestId("generation-route-back")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("generation-drawer")).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/admin/generations/${createdGenerationId}$`),
    );
    await expect(page.getByTestId("generation-open-edit")).toBeVisible();

    await page.getByTestId("generation-route-back").click();
    await expect(page).toHaveURL(/\/admin\/generations$/);
    const createdRow = page
      .getByTestId(`generation-row-${createdGenerationId}`)
      .first();
    await expect(createdRow).toBeVisible({ timeout: 20_000 });
    await createdRow.getByRole("button").click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/generations/${createdGenerationId}$`),
    );

    await page.goto(`/admin/generations/${createdGenerationId}/edit`);
    await expect(page.getByTestId("generation-drawer")).toBeVisible();
    await expect(page.getByTestId("generation-edit-name")).toHaveValue(
      generationName,
    );

    await page.getByTestId("generation-edit-name").fill(updatedGenerationName);
    await page
      .getByTestId("generation-edit-sort-order")
      .fill(String(Number(baseSortOrder) + 1));
    await page.getByTestId("generation-edit-start-date").fill("2031-01-01");
    await page.getByTestId("generation-edit-end-date").fill("2031-12-31");
    await page.getByTestId("generation-edit-submit").click();

    await expect(page.getByTestId("generations-success")).toContainText("수정");
    await expect(page).toHaveURL(
      new RegExp(`/admin/generations/${createdGenerationId}$`),
    );
    await page.goto(`/admin/generations/${createdGenerationId}/edit`);
    await expect(page.getByTestId("generation-edit-name")).toHaveValue(
      updatedGenerationName,
    );

    const assignButton = page.getByTestId(
      `generation-member-assign-${tempUser.id}`,
    );
    await expect(assignButton).toBeVisible();
    await assignButton.click();
    await expect(
      page.getByTestId("generation-members-apply-button"),
    ).toBeEnabled();
    await page.getByTestId("generation-members-apply-button").click();
    await expect(
      page.getByTestId(`generation-member-row-${tempUser.id}`),
    ).toBeVisible();

    const unassignButton = page.getByTestId(
      `generation-member-unassign-${tempUser.id}`,
    );
    await expect(unassignButton).toBeVisible();
    await unassignButton.click();
    await expect(
      page.getByTestId("generation-members-apply-button"),
    ).toBeEnabled();
    await page.getByTestId("generation-members-apply-button").click();
    await expect(
      page.getByTestId(`generation-member-row-${tempUser.id}`),
    ).toHaveCount(0);

    await page.getByTestId("generation-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("generations-success")).toContainText("삭제");
    const updatedRow = page
      .getByTestId(`generation-row-${createdGenerationId}`)
      .first();
    await expect(updatedRow).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin\/generations$/);
    await expect(page.getByTestId("generation-drawer")).toBeHidden();

    await cleanupByPrefix(request, e2ePrefix);
  });
});
