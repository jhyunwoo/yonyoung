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

  test("create, update, delete activity with detail image and file upload flow", async ({
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
    const title = uniqueText(e2ePrefix, "activity");
    const updatedTitle = `${title}-updated`;

    await page.goto("/admin/activities");
    await page.getByTestId("activity-open-create").click();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("create");

    await page.getByTestId("activity-create-title").fill(title);
    await page
      .getByTestId("activity-create-description")
      .fill(`${e2ePrefix} activity description`);
    await page.getByTestId("activity-create-date").fill("2030-03-01");
    await page.getByTestId("activity-create-generation-id").selectOption(generation.id);
    await page.getByTestId("activity-create-cover-file").setInputFiles(sampleImagePath);
    await page.getByTestId("activity-create-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="activity-row-"]', {
      hasText: title,
    });
    await expect(createdRow).toBeVisible();
    const createdRowTestId = await createdRow.getAttribute("data-testid");
    if (!createdRowTestId) {
      throw new Error("created activity row test id is missing");
    }
    const createdActivityId = createdRowTestId.replace("activity-row-", "");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(createdActivityId);

    await page.reload();
    await expect(page.getByTestId("activity-drawer")).toBeVisible();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(createdActivityId);
    await expect(page.getByTestId("activity-edit-title")).toHaveValue(title);

    await page.goto(`/admin/activities?panel=edit&id=${createdActivityId}`);
    await expect(page.getByTestId("activity-drawer")).toBeVisible();
    await expect(page.getByTestId("activity-edit-title")).toHaveValue(title);

    await page.getByTestId("activity-edit-title").fill(updatedTitle);
    await page.getByTestId("activity-edit-description").fill(`${e2ePrefix} activity edited`);
    await page.getByTestId("activity-edit-date").fill("2030-03-15");
    await page.getByTestId("activity-edit-generation-id").selectOption(generation.id);
    await page.getByTestId("activity-edit-cover-file").setInputFiles(sampleImagePath);
    await page.getByTestId("activity-edit-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("수정");

    const updatedRow = page.locator('[data-testid^="activity-row-"]', {
      hasText: updatedTitle,
    });
    await expect(updatedRow).toBeVisible();

    await page.getByTestId("activity-detail-create-image-file").setInputFiles(sampleImagePath);
    await page.getByTestId("activity-detail-create-sort-order").fill("0");
    await page.getByTestId("activity-detail-create-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("추가");

    const detailRow = page.locator('[data-testid^="activity-detail-row-"]').first();
    await expect(detailRow).toBeVisible();
    await detailRow.getByRole("button", { name: /선택|선택됨/ }).click();
    await expect(detailRow.getByRole("button", { name: "선택됨" })).toBeVisible();

    await page.getByTestId("activity-detail-edit-image-file").setInputFiles(sampleImagePath);
    await page.getByTestId("activity-detail-edit-sort-order").fill("1");
    await page.getByTestId("activity-detail-edit-submit").click();

    await expect(page.getByTestId("activities-success")).toContainText("수정");

    await page.getByTestId("activity-detail-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("activities-success")).toContainText("삭제");

    await page.getByTestId("activity-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("activities-success")).toContainText("삭제");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBeNull();
    await expect.poll(async () => (await readDrawerQuery()).id).toBeNull();

    await cleanupByPrefix(request, e2ePrefix);
  });
});
