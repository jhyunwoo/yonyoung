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

  test("create, update, delete supporter with file upload flow", async ({
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

    const runFileUploadFlow = await shouldRunFileUploadFlow(request, page);
    test.skip(!runFileUploadFlow, "파일 업로드 가능한 환경에서만 실행합니다.");
    const name = uniqueText(e2ePrefix, "supporter");
    const updatedName = `${name}-updated`;

    await page.goto("/admin/supporters");
    await page.getByTestId("supporter-open-create").click();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("create");

    await page.getByTestId("supporter-create-name").fill(name);
    await page
      .getByTestId("supporter-create-link")
      .fill(`https://example.com/${e2ePrefix}/supporter`);
    await page.getByTestId("supporter-create-expires-at").fill("2032-01-01");
    await page.getByTestId("supporter-create-logo-file").setInputFiles(sampleImagePath);
    await page.getByTestId("supporter-create-submit").click();

    await expect(page.getByTestId("supporters-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="supporter-row-"]', {
      hasText: name,
    });
    await expect(createdRow).toBeVisible();
    const createdRowTestId = await createdRow.getAttribute("data-testid");
    if (!createdRowTestId) {
      throw new Error("created supporter row test id is missing");
    }
    const createdSupporterId = createdRowTestId.replace("supporter-row-", "");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(createdSupporterId);

    await page.reload();
    await expect(page.getByTestId("supporter-drawer")).toBeVisible();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(createdSupporterId);
    await expect(page.getByTestId("supporter-edit-name")).toHaveValue(name);

    await page.goto(`/admin/supporters?panel=edit&id=${createdSupporterId}`);
    await expect(page.getByTestId("supporter-drawer")).toBeVisible();
    await expect(page.getByTestId("supporter-edit-name")).toHaveValue(name);

    await page.getByTestId("supporter-edit-name").fill(updatedName);
    await page
      .getByTestId("supporter-edit-link")
      .fill(`https://example.com/${e2ePrefix}/supporter-updated`);
    await page.getByTestId("supporter-edit-expires-at").fill("2032-12-31");
    await page.getByTestId("supporter-edit-logo-file").setInputFiles(sampleImagePath);
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

    await page.getByTestId("supporter-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("supporters-success")).toContainText("삭제");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBeNull();
    await expect.poll(async () => (await readDrawerQuery()).id).toBeNull();

    await cleanupByPrefix(request, e2ePrefix);
  });
});
