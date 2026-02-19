import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  installPresignedUploadMock,
  shouldUseUploadMock,
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

  test("create, update, delete exhibition with detail image and file upload flow", async ({
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
    let uploadMock: Awaited<ReturnType<typeof installPresignedUploadMock>> | null = null;
    if (shouldUseUploadMock()) {
      uploadMock = await installPresignedUploadMock(page, {
        routes: [
          {
            key: "exhibition-cover",
            presignPath: "/exhibitions/presign/cover",
            resource: "exhibitions",
            slot: "cover",
            requiredHeaders: {
              "Content-Type": "image/png",
              "x-amz-meta-source": "e2e-exhibition-cover",
            },
            uploadDelayMs: 120,
          },
          {
            key: "exhibition-detail",
            presignPath: "/exhibitions/presign/detail",
            resource: "exhibitions",
            slot: "detail",
            requiredHeaders: {
              "Content-Type": "image/png",
              "x-amz-meta-source": "e2e-exhibition-detail",
            },
            uploadDelayMs: 120,
          },
        ],
      });
    } else {
      const runFileUploadFlow = await shouldRunFileUploadFlow(request, page);
      test.skip(!runFileUploadFlow, "파일 업로드 가능한 환경에서만 실행합니다.");
    }
    const title = uniqueText(e2ePrefix, "exhibition");
    const updatedTitle = `${title}-updated`;

    await page.goto("/admin/exhibitions");
    await page.getByTestId("exhibition-open-create").click();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("create");

    await page.getByTestId("exhibition-create-title").fill(title);
    await page.getByTestId("exhibition-create-start-date").fill("2031-01-10");
    await page.getByTestId("exhibition-create-end-date").fill("2031-01-20");
    await page.getByTestId("exhibition-create-generation-id").selectOption(generation.id);
    await page.getByTestId("exhibition-create-place").fill(`${e2ePrefix} hall`);
    await page
      .getByTestId("exhibition-create-description")
      .fill(`${e2ePrefix} exhibition description`);
    await page.getByTestId("exhibition-create-cover-file").setInputFiles(sampleImagePath);
    await page.getByTestId("exhibition-create-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("생성");

    const createdRow = page.locator('[data-testid^="exhibition-row-"]', {
      hasText: title,
    });
    await expect(createdRow).toBeVisible();
    const createdRowTestId = await createdRow.getAttribute("data-testid");
    if (!createdRowTestId) {
      throw new Error("created exhibition row test id is missing");
    }
    const createdExhibitionId = createdRowTestId.replace("exhibition-row-", "");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(createdExhibitionId);

    await page.reload();
    await expect(page.getByTestId("exhibition-drawer")).toBeVisible();
    await expect.poll(async () => (await readDrawerQuery()).panel).toBe("edit");
    await expect.poll(async () => (await readDrawerQuery()).id).toBe(createdExhibitionId);
    await expect(page.getByTestId("exhibition-edit-title")).toHaveValue(title);

    await page.goto(`/admin/exhibitions?panel=edit&id=${createdExhibitionId}`);
    await expect(page.getByTestId("exhibition-drawer")).toBeVisible();
    await expect(page.getByTestId("exhibition-edit-title")).toHaveValue(title);

    await page.getByTestId("exhibition-edit-title").fill(updatedTitle);
    await page.getByTestId("exhibition-edit-start-date").fill("2031-02-01");
    await page.getByTestId("exhibition-edit-end-date").fill("2031-02-15");
    await page.getByTestId("exhibition-edit-generation-id").selectOption(generation.id);
    await page.getByTestId("exhibition-edit-place").fill(`${e2ePrefix} gallery`);
    await page
      .getByTestId("exhibition-edit-description")
      .fill(`${e2ePrefix} exhibition updated description`);
    await page.getByTestId("exhibition-edit-cover-file").setInputFiles(sampleImagePath);
    await page.getByTestId("exhibition-edit-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("수정");

    const updatedRow = page.locator('[data-testid^="exhibition-row-"]', {
      hasText: updatedTitle,
    });
    await expect(updatedRow).toBeVisible();

    await page.getByTestId("exhibition-detail-create-image-file").setInputFiles(sampleImagePath);
    await page.getByTestId("exhibition-detail-create-sort-order").fill("0");
    await page.getByTestId("exhibition-detail-create-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("추가");

    const detailRow = page.locator('[data-testid^="exhibition-detail-row-"]').first();
    await expect(detailRow).toBeVisible();
    await detailRow.getByRole("button").click();
    await expect(page.getByTestId("exhibition-detail-edit-sort-order")).toHaveValue("0");

    await page.getByTestId("exhibition-detail-edit-image-file").setInputFiles(sampleImagePath);
    await page.getByTestId("exhibition-detail-edit-sort-order").fill("1");
    await page.getByTestId("exhibition-detail-edit-submit").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("수정");

    await page.getByTestId("exhibition-detail-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.locator('[data-testid^="exhibition-detail-row-"]')).toHaveCount(0);

    await page.getByTestId("exhibition-delete-button").click();
    await page.getByTestId("confirm-modal-confirm").click();

    await expect(page.getByTestId("exhibitions-success")).toContainText("삭제");
    await expect.poll(async () => (await readDrawerQuery()).panel).toBeNull();
    await expect.poll(async () => (await readDrawerQuery()).id).toBeNull();

    if (uploadMock) {
      const coverPresignPayloads = uploadMock.getPresignPayloads("exhibition-cover");
      const detailPresignPayloads = uploadMock.getPresignPayloads("exhibition-detail");
      expect(coverPresignPayloads[0]).toMatchObject({
        fileName: "test-image.png",
        contentType: "image/png",
      });
      expect(detailPresignPayloads[0]).toMatchObject({
        fileName: "test-image.png",
        contentType: "image/png",
      });

      expect(uploadMock.getUploadCount("exhibition-cover")).toBe(2);
      expect(uploadMock.getUploadCount("exhibition-detail")).toBe(2);

      const firstCoverUpload = uploadMock.getUploadRequests("exhibition-cover")[0];
      const firstDetailUpload = uploadMock.getUploadRequests("exhibition-detail")[0];
      expect(firstCoverUpload?.headers["x-amz-meta-source"]).toBe("e2e-exhibition-cover");
      expect(firstDetailUpload?.headers["x-amz-meta-source"]).toBe("e2e-exhibition-detail");
    }

    await cleanupByPrefix(request, e2ePrefix);
  });
});
