import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  signUpTemporaryUser,
  uniqueText,
} from "./helpers";

test.describe("generations crud", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find((item) => item.type === "e2e-prefix")?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("create, update, member-assign, delete generation", async ({ page, request, e2ePrefix }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });
    await ensureAdminSession(page);

    const generationName = uniqueText(e2ePrefix, "generation");
    const updatedGenerationName = `${generationName}-updated`;
    const baseSortOrder = String(
      (Date.now() % 1_000_000) * 1_000 + Math.floor(Math.random() * 1_000),
    );
    const tempUser = await signUpTemporaryUser(e2ePrefix);

    await page.goto("/admin/generations");
    if ((await page.getByRole("heading", { name: "관리자 로그인" }).count()) > 0) {
      await ensureAdminSession(page);
      await page.goto("/admin/generations");
    }
    await expect(page.getByTestId("generations-page")).toBeVisible();

    await page.getByTestId("generation-create-name").fill(generationName);
    await page.getByTestId("generation-create-sort-order").fill(baseSortOrder);
    await page.getByTestId("generation-create-start-date").fill("2030-01-01");
    await page.getByTestId("generation-create-end-date").fill("2030-12-31");
    await page.getByTestId("generation-create-submit").click();

    await expect(page.getByTestId("generations-success")).toContainText("생성");
    await expect(page.getByTestId("generation-create-submit")).toBeEnabled();

    const createdRow = page.locator('[data-testid^="generation-row-"]', {
      hasText: generationName,
    });
    await expect(createdRow).toBeVisible();
    const createdRowTestId = await createdRow.getAttribute("data-testid");
    if (!createdRowTestId) {
      throw new Error("created generation row test id is missing");
    }
    const createdGenerationId = createdRowTestId.replace("generation-row-", "");

    await createdRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(createdRow.getByRole("button", { name: "선택됨" })).toBeVisible();
    await expect(page.getByTestId("generation-edit-name")).toHaveValue(generationName);

    await page.getByTestId("generation-edit-name").fill(updatedGenerationName);
    await page
      .getByTestId("generation-edit-sort-order")
      .fill(String(Number(baseSortOrder) + 1));
    await page.getByTestId("generation-edit-start-date").fill("2031-01-01");
    await page.getByTestId("generation-edit-end-date").fill("2031-12-31");
    await page.getByTestId("generation-edit-submit").click();

    await expect(page.getByTestId("generations-success")).toContainText("수정");
    await expect(page.getByTestId("generation-edit-submit")).toBeEnabled();

    await expect
      .poll(
        async () => {
          await page.getByTestId("generations-reload-button").click();
          return (
            (await page
              .getByTestId(`generation-row-${createdGenerationId}`)
              .textContent()) ?? ""
          );
        },
        {
          timeout: 20_000,
        },
      )
      .toContain(updatedGenerationName);

    const updatedRow = page.getByTestId(`generation-row-${createdGenerationId}`);
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await page.getByTestId("generations-reload-button").click();

    const assignButton = page.getByTestId(`generation-member-assign-${tempUser.id}`);
    await expect(assignButton).toBeVisible();
    await assignButton.click();
    await expect(page.getByTestId("generations-success")).toContainText("구성");
    await expect(page.getByTestId(`generation-member-row-${tempUser.id}`)).toBeVisible();

    const unassignButton = page.getByTestId(`generation-member-unassign-${tempUser.id}`);
    await unassignButton.click();
    await expect(page.getByTestId("generations-success")).toContainText("해제");
    await expect(page.getByTestId(`generation-member-row-${tempUser.id}`)).toHaveCount(0);

    await updatedRow.getByRole("button", { name: /선택|선택됨/ }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("generation-delete-button").click();

    await expect(page.getByTestId("generations-success")).toContainText("삭제");
    await expect(updatedRow).toHaveCount(0);

    await cleanupByPrefix(request, e2ePrefix);
  });
});
