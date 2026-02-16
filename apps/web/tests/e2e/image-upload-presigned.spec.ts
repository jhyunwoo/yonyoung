import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  ensureGeneration,
  uniqueText,
} from "./helpers";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";
const WEB_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const resolveWebOrigin = (): string => {
  try {
    return new URL(WEB_BASE_URL).origin;
  } catch {
    return "http://localhost:3000";
  }
};

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
    const objectKey = `activities/${e2ePrefix}/cover/mock-cover.png`;
    const uploadUrl =
      "https://upload.e2e.invalid/activities/mock-cover.png?X-Amz-Algorithm=AWS4-HMAC-SHA256";
    const publicUrl = `https://storage.yonyoung.moveto.kr/${objectKey}`;
    const corsOrigin = resolveWebOrigin();

    let presignPayload: Record<string, unknown> | null = null;
    let createPayload: Record<string, unknown> | null = null;
    let uploadedHeaderSnapshot: Record<string, string> | null = null;
    let putUploadCount = 0;

    await page.route(`${API_BASE_URL}/api/activities/presign/cover`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      presignPayload = parseJsonBody(route.request().postData());
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            uploadUrl,
            objectKey,
            publicUrl,
            requiredHeaders: {
              "Content-Type": "image/png",
              "x-amz-meta-source": "e2e",
            },
          },
        }),
      });
    });

    await page.route("https://upload.e2e.invalid/**", async (route) => {
      const method = route.request().method();

      if (method === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": corsOrigin,
            "access-control-allow-methods": "PUT, OPTIONS",
            "access-control-allow-headers": "Content-Type, x-amz-meta-source",
            "access-control-max-age": "86400",
          },
        });
        return;
      }

      if (method === "PUT") {
        putUploadCount += 1;
        uploadedHeaderSnapshot = route.request().headers();

        await new Promise((resolve) => setTimeout(resolve, 180));
        await route.fulfill({
          status: 200,
          headers: {
            "access-control-allow-origin": corsOrigin,
            etag: "\"mock-etag\"",
          },
          body: "",
        });
        return;
      }

      await route.continue();
    });

    await page.route(`${API_BASE_URL}/api/activities`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      createPayload = parseJsonBody(route.request().postData());
      await route.continue();
    });

    await page.goto("/admin/activities");

    await page.getByTestId("activity-create-title").fill(title);
    await page.getByTestId("activity-create-description").fill(`${e2ePrefix} upload test`);
    await page.getByTestId("activity-create-date").fill("2030-04-01");
    await page.getByTestId("activity-create-generation-id").selectOption(generation.id);
    await page.getByTestId("activity-create-cover-file").setInputFiles(sampleImagePath);

    await expect(page.getByTestId("activity-create-cover-preview")).toBeVisible();

    await page.getByTestId("activity-create-submit").click();

    await expect(page.getByTestId("activity-create-cover-upload-progress")).toBeVisible();
    await expect(page.getByTestId("activities-success")).toContainText("생성");

    expect(presignPayload).toMatchObject({
      fileName: "test-image.png",
      contentType: "image/png",
    });
    expect(putUploadCount).toBe(1);
    expect(uploadedHeaderSnapshot?.["content-type"]).toBe("image/png");
    expect(uploadedHeaderSnapshot?.["x-amz-meta-source"]).toBe("e2e");
    expect(createPayload).toMatchObject({
      title,
      generationId: generation.id,
      coverImageUrl: publicUrl,
    });
  });
});
