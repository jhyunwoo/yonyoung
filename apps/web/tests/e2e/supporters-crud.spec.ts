import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  installPresignedUploadMock,
  shouldUseUploadMock,
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

    let uploadMock: Awaited<ReturnType<typeof installPresignedUploadMock>> | null = null;
    if (shouldUseUploadMock()) {
      uploadMock = await installPresignedUploadMock(page, {
        routes: [
          {
            key: "supporter-logo",
            presignPath: "/supporters/presign/logo",
            resource: "supporters",
            slot: "logo",
            requiredHeaders: {
              "Content-Type": "image/png",
              "x-amz-meta-source": "e2e-supporter-logo",
            },
            uploadDelayMs: 120,
          },
        ],
      });
    } else {
      const runFileUploadFlow = await shouldRunFileUploadFlow(request, page);
      test.skip(!runFileUploadFlow, "파일 업로드 가능한 환경에서만 실행합니다.");
    }
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
    await expect(page.getByTestId("supporters-success")).toContainText("수정");

    const updatedRow = page.locator('[data-testid^="supporter-row-"]', {
      hasText: e2ePrefix,
    });
    await expect(updatedRow).toBeVisible();

    await page.getByTestId("supporter-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("supporters-success")).toContainText("삭제");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBeNull();
    await expect.poll(async () => (await readDrawerQuery()).id).toBeNull();

    if (uploadMock) {
      const logoPresignPayloads = uploadMock.getPresignPayloads("supporter-logo");
      expect(logoPresignPayloads[0]).toMatchObject({
        fileName: "test-image.png",
        contentType: "image/png",
      });
      expect(uploadMock.getUploadCount("supporter-logo")).toBe(2);

      const firstUpload = uploadMock.getUploadRequests("supporter-logo")[0];
      expect(firstUpload?.headers["x-amz-meta-source"]).toBe("e2e-supporter-logo");
    }

    await cleanupByPrefix(request, e2ePrefix);
  });
});
