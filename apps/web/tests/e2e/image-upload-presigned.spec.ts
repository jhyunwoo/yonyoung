import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  installPresignedUploadMock,
  signUpTemporaryUser,
  uniqueText,
} from "./helpers";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";

const parseJsonBody = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const readStringField = (
  payload: Record<string, unknown> | null,
  field: string,
): string | null => {
  const value = payload?.[field];
  return typeof value === "string" ? value : null;
};

test.describe("presigned image upload flow", () => {
  test.afterEach(async ({ request }, testInfo) => {
    const prefix = testInfo.annotations.find(
      (item) => item.type === "e2e-prefix",
    )?.description;
    if (prefix) {
      await cleanupByPrefix(request, prefix);
    }
  });

  test("activity 생성 시 presign -> PUT 업로드 -> publicUrl 저장 순서로 동작한다", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });

    await ensureAdminSession(page);
    const generation = await ensureGeneration(request, e2ePrefix);
    const title = uniqueText(e2ePrefix, "upload-activity");
    const uploadMock = await installPresignedUploadMock(page, {
      routes: [
        {
          key: "activity-cover",
          presignPath: "/activities/presign/cover",
          resource: "activities",
          slot: "cover",
          requiredHeaders: {
            "Content-Type": "image/png",
            "x-amz-meta-source": "e2e-contract-activity",
          },
          uploadDelayMs: 180,
        },
      ],
    });

    let createPayload: Record<string, unknown> | null = null;
    await page.route(`${API_BASE_URL}/api/activities`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      createPayload = parseJsonBody(route.request().postData());
      await route.continue();
    });

    await page.goto("/admin/activities");
    await page.getByTestId("activity-open-create").click();

    await page.getByTestId("activity-create-title").fill(title);
    await page.getByTestId("activity-create-description").fill(`${e2ePrefix} upload test`);
    await page.getByTestId("activity-create-date").fill("2030-04-01");
    await page.getByTestId("activity-create-generation-id").selectOption(generation.id);
    await page.getByTestId("activity-create-cover-file").setInputFiles(sampleImagePath);

    await expect(page.getByTestId("activity-create-cover-upload-progress")).toBeVisible();
    await expect(page.getByTestId("activity-create-cover-upload-success")).toBeVisible();

    await page.getByTestId("activity-create-submit").click();
    await expect(page.getByTestId("activities-success")).toContainText("생성");

    expect(uploadMock.getLatestPresignPayload("activity-cover")).toMatchObject({
      fileName: "test-image.png",
      contentType: "image/png",
    });
    expect(uploadMock.getUploadCount("activity-cover")).toBe(1);
    expect(uploadMock.getUploadRequests("activity-cover")[0]?.headers["x-amz-meta-source"]).toBe(
      "e2e-contract-activity",
    );
    expect(createPayload).toMatchObject({
      title,
      generationId: generation.id,
    });
    const coverImageUrl = readStringField(createPayload, "coverImageUrl");
    expect(typeof coverImageUrl).toBe("string");
    expect(coverImageUrl).toContain("https://storage.yonyoung.moveto.kr/activities/");
  });

  test("exhibition 생성 시 커버 이미지 업로드 계약을 만족한다", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });

    await ensureAdminSession(page);
    const generation = await ensureGeneration(request, e2ePrefix);
    const title = uniqueText(e2ePrefix, "upload-exhibition");
    const uploadMock = await installPresignedUploadMock(page, {
      routes: [
        {
          key: "exhibition-cover",
          presignPath: "/exhibitions/presign/cover",
          resource: "exhibitions",
          slot: "cover",
          requiredHeaders: {
            "Content-Type": "image/png",
            "x-amz-meta-source": "e2e-contract-exhibition",
          },
          uploadDelayMs: 180,
        },
      ],
    });

    let createPayload: Record<string, unknown> | null = null;
    await page.route(`${API_BASE_URL}/api/exhibitions`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      createPayload = parseJsonBody(route.request().postData());
      await route.continue();
    });

    await page.goto("/admin/exhibitions");
    await page.getByTestId("exhibition-open-create").click();

    await page.getByTestId("exhibition-create-title").fill(title);
    await page.getByTestId("exhibition-create-start-date").fill("2031-01-10");
    await page.getByTestId("exhibition-create-end-date").fill("2031-01-20");
    await page.getByTestId("exhibition-create-generation-id").selectOption(generation.id);
    await page.getByTestId("exhibition-create-place").fill(`${e2ePrefix} hall`);
    await page
      .getByTestId("exhibition-create-description")
      .fill(`${e2ePrefix} exhibition description`);
    await page.getByTestId("exhibition-create-cover-file").setInputFiles(sampleImagePath);

    await expect(page.getByTestId("exhibition-create-cover-upload-progress")).toBeVisible();
    await expect(page.getByTestId("exhibition-create-cover-upload-success")).toBeVisible();

    await page.getByTestId("exhibition-create-submit").click();
    await expect(page.getByTestId("exhibitions-success")).toContainText("생성");

    expect(uploadMock.getLatestPresignPayload("exhibition-cover")).toMatchObject({
      fileName: "test-image.png",
      contentType: "image/png",
    });
    expect(uploadMock.getUploadCount("exhibition-cover")).toBe(1);
    expect(
      uploadMock.getUploadRequests("exhibition-cover")[0]?.headers["x-amz-meta-source"],
    ).toBe("e2e-contract-exhibition");
    expect(createPayload).toMatchObject({
      title,
      generationId: generation.id,
    });
    expect(readStringField(createPayload, "coverImageUrl")).toContain(
      "https://storage.yonyoung.moveto.kr/exhibitions/",
    );
  });

  test("supporter 생성 시 로고 업로드 계약을 만족한다", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });

    await ensureAdminSession(page);
    const name = uniqueText(e2ePrefix, "upload-supporter");
    const uploadMock = await installPresignedUploadMock(page, {
      routes: [
        {
          key: "supporter-logo",
          presignPath: "/supporters/presign/logo",
          resource: "supporters",
          slot: "logo",
          requiredHeaders: {
            "Content-Type": "image/png",
            "x-amz-meta-source": "e2e-contract-supporter",
          },
          uploadDelayMs: 180,
        },
      ],
    });

    let createPayload: Record<string, unknown> | null = null;
    await page.route(`${API_BASE_URL}/api/supporters`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      createPayload = parseJsonBody(route.request().postData());
      await route.continue();
    });

    await page.goto("/admin/supporters");
    await page.getByTestId("supporter-open-create").click();

    await page.getByTestId("supporter-create-name").fill(name);
    await page
      .getByTestId("supporter-create-link")
      .fill(`https://example.com/${e2ePrefix}/supporter`);
    await page.getByTestId("supporter-create-expires-at").fill("2032-01-01");
    await page.getByTestId("supporter-create-logo-file").setInputFiles(sampleImagePath);

    await expect(page.getByTestId("supporter-create-logo-upload-progress")).toBeVisible();
    await expect(page.getByTestId("supporter-create-logo-upload-success")).toBeVisible();

    await page.getByTestId("supporter-create-submit").click();
    await expect(page.getByTestId("supporters-success")).toContainText("생성");

    expect(uploadMock.getLatestPresignPayload("supporter-logo")).toMatchObject({
      fileName: "test-image.png",
      contentType: "image/png",
    });
    expect(uploadMock.getUploadCount("supporter-logo")).toBe(1);
    expect(uploadMock.getUploadRequests("supporter-logo")[0]?.headers["x-amz-meta-source"]).toBe(
      "e2e-contract-supporter",
    );
    expect(createPayload).toMatchObject({
      name,
    });
    expect(readStringField(createPayload, "logoUrl")).toContain(
      "https://storage.yonyoung.moveto.kr/supporters/",
    );
  });

  test("user 수정 시 프로필 업로드 계약을 만족한다", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(180_000);
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });

    await ensureAdminSession(page);
    const generation = await ensureGeneration(request, e2ePrefix);
    const tempUser = await signUpTemporaryUser(e2ePrefix);
    const uploadMock = await installPresignedUploadMock(page, {
      routes: [
        {
          key: "user-profile",
          presignPath: "/users/presign/profile",
          resource: "users",
          slot: "profile",
          requiredHeaders: {
            "Content-Type": "image/png",
            "x-amz-meta-source": "e2e-contract-user",
          },
          uploadDelayMs: 180,
        },
      ],
    });

    let updatePayload: Record<string, unknown> | null = null;
    await page.route(`${API_BASE_URL}/api/users/**`, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback();
        return;
      }

      updatePayload = parseJsonBody(route.request().postData());
      await route.fallback();
    });

    await page.goto("/admin/users");
    await page.getByTestId("users-reload-button").click();
    await page.getByTestId("user-search-input").fill(tempUser.email);

    const userRow = page.locator('[data-testid^="user-row-"]', {
      hasText: tempUser.email,
    });
    await expect(userRow).toBeVisible();
    const userRowTestId = await userRow.getAttribute("data-testid");
    if (!userRowTestId) {
      throw new Error("target user row test id is missing");
    }
    const targetUserId = userRowTestId.replace("user-row-", "");
    await page.getByTestId(`user-open-detail-${targetUserId}`).click();
    await expect(page.getByTestId("user-detail-card")).toContainText(tempUser.email);
    await page.getByTestId("user-open-edit").click();
    await expect(page.getByTestId("user-edit-form")).toBeVisible();
    await expect(page.getByTestId("user-edit-name")).toHaveValue(tempUser.name);

    await page.getByTestId("user-edit-name").fill(uniqueText(e2ePrefix, "user-contract"));
    await page.getByTestId("user-edit-role").selectOption("regular_member");
    const generationCheckbox = page.getByTestId(
      `user-edit-generation-checkbox-${generation.id}`,
    );
    if (!(await generationCheckbox.isChecked())) {
      await generationCheckbox.check();
    }
    await page.getByTestId("user-edit-image-file").setInputFiles(sampleImagePath);

    await expect(page.getByTestId("user-edit-image-upload-progress")).toBeVisible();
    await expect.poll(() => uploadMock.getUploadCount("user-profile")).toBe(1);
    await expect(page.getByTestId("user-edit-submit")).toBeEnabled();

    await page.getByTestId("user-edit-submit").click();
    await expect(page.getByTestId("users-success")).toContainText("수정");

    expect(uploadMock.getLatestPresignPayload("user-profile")).toMatchObject({
      fileName: "test-image.png",
      contentType: "image/png",
    });
    expect(uploadMock.getUploadCount("user-profile")).toBe(1);
    expect(uploadMock.getUploadRequests("user-profile")[0]?.headers["x-amz-meta-source"]).toBe(
      "e2e-contract-user",
    );
    const generationIds = Array.isArray(updatePayload?.["generationIds"])
      ? updatePayload?.["generationIds"]
      : [];
    expect(generationIds).toContain(generation.id);
    expect(readStringField(updatePayload, "image")).toContain(
      "https://storage.yonyoung.moveto.kr/users/",
    );
  });

  test("내 프로필 수정 시 프로필 업로드 계약을 만족한다", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(180_000);
    await ensureAdminSession(page);

    const uploadMock = await installPresignedUploadMock(page, {
      routes: [
        {
          key: "profile-self",
          presignPath: "/users/presign/profile",
          resource: "users",
          slot: "profile",
          requiredHeaders: {
            "Content-Type": "image/png",
            "x-amz-meta-source": "e2e-contract-profile-self",
          },
          uploadDelayMs: 180,
        },
      ],
    });

    let updatePayload: Record<string, unknown> | null = null;
    await page.route(`${API_BASE_URL}/api/users/**`, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback();
        return;
      }

      updatePayload = parseJsonBody(route.request().postData());
      await route.fallback();
    });

    await page.goto("/admin/profile");

    await page.getByTestId("admin-profile-image-file").setInputFiles(sampleImagePath);
    await expect(page.getByTestId("admin-profile-image-upload-progress")).toBeVisible();
    await expect.poll(() => uploadMock.getUploadCount("profile-self")).toBe(1);
    await expect(page.getByTestId("admin-profile-submit")).toBeEnabled();

    await page.getByTestId("admin-profile-given-name").fill(uniqueText(e2ePrefix, "self"));
    await page.getByTestId("admin-profile-submit").click();
    await expect(page).toHaveURL(/\/admin$/);

    expect(uploadMock.getLatestPresignPayload("profile-self")).toMatchObject({
      fileName: "test-image.png",
      contentType: "image/png",
    });
    expect(uploadMock.getUploadCount("profile-self")).toBe(1);
    expect(uploadMock.getUploadRequests("profile-self")[0]?.headers["x-amz-meta-source"]).toBe(
      "e2e-contract-profile-self",
    );
    expect(readStringField(updatePayload, "image")).toContain(
      "https://storage.yonyoung.moveto.kr/users/",
    );
  });

  test("activity 업로드 실패 후 재시도하면 생성이 정상 완료된다", async ({
    page,
    request,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.info().annotations.push({ type: "e2e-prefix", description: e2ePrefix });

    await ensureAdminSession(page);
    const generation = await ensureGeneration(request, e2ePrefix);
    const title = uniqueText(e2ePrefix, "upload-retry-activity");
    const uploadMock = await installPresignedUploadMock(page, {
      routes: [
        {
          key: "activity-cover-retry",
          presignPath: "/activities/presign/cover",
          resource: "activities",
          slot: "cover",
          requiredHeaders: {
            "Content-Type": "image/png",
            "x-amz-meta-source": "e2e-retry-activity",
          },
          failUploadAttempts: 1,
          uploadDelayMs: 120,
        },
      ],
    });

    await page.goto("/admin/activities");
    await page.getByTestId("activity-open-create").click();

    await page.getByTestId("activity-create-title").fill(title);
    await page.getByTestId("activity-create-description").fill(`${e2ePrefix} upload retry test`);
    await page.getByTestId("activity-create-date").fill("2030-04-01");
    await page.getByTestId("activity-create-generation-id").selectOption(generation.id);
    await page.getByTestId("activity-create-cover-file").setInputFiles(sampleImagePath);

    await expect(page.getByTestId("activity-create-cover-upload-error")).toBeVisible();
    await expect(page.getByTestId("activity-create-submit")).toBeDisabled();

    await page.getByTestId("activity-create-cover-upload-retry").click();

    await expect(page.getByTestId("activity-create-cover-upload-success")).toBeVisible();
    await expect(page.getByTestId("activity-create-submit")).toBeEnabled();

    await page.getByTestId("activity-create-submit").click();
    await expect(page.getByTestId("activities-success")).toContainText("생성");

    expect(uploadMock.getUploadCount("activity-cover-retry")).toBe(2);
  });
});
