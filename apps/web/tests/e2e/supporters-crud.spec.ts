import { test, expect } from "./fixtures";
import { cleanupByPrefix, ensureAdminSession, uniqueText } from "./helpers";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";

test.describe("supporters crud", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("후원사 상세에서 로고 파일 업로드 수정 및 삭제가 동작한다", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(240_000);

    await ensureAdminSession(page);

    const name = uniqueText(e2ePrefix, "supporter");
    const createResponse = await page.request.post(`${API_BASE_URL}/api/supporters`, {
      data: {
        name,
        link: "https://example.com/supporter",
        logoUrl: "https://picsum.photos/640/360",
        expiresAt: Date.parse("2031-01-01T00:00:00.000Z"),
      },
    });
    expect(createResponse.status()).toBe(201);
    const createdBody = (await createResponse.json()) as { data: { id: string } };
    const supporterId = createdBody.data.id;

    await page.goto(`/dashboard/settings/supporters/${supporterId}`);
    await expect(page.getByRole("heading", { name: "후원사 상세" })).toBeVisible();
    await page.getByRole("button", { name: "수정" }).click();

    const updatedName = `${name}-updated`;
    await page.getByLabel("후원사 이름").fill(updatedName);
    await page.getByLabel("후원사 링크").fill("https://example.com/supporter-updated");
    await page.getByLabel("만료일").fill("2031-12-31");
    await page.getByLabel("로고 파일").setInputFiles(sampleImagePath);
    await page.getByRole("button", { name: "저장" }).click();

    await expect(
      page.getByRole("heading", { level: 2, name: updatedName }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "수정" })).toBeVisible({
      timeout: 30_000,
    });

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/supporters$/, {
      timeout: 60_000,
    });
  });
});
