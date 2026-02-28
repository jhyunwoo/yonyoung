import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  pickExistingGeneration,
  uniqueText,
} from "./helpers";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";

const fillRichTextEditor = async (page: Page, text: string) => {
  const editor = page.locator("[contenteditable='true']").first();
  await editor.click();
  await editor.press("Control+A");
  await editor.type(text);
};

test.describe("activities crud", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("활동 생성(cover+detail) -> 상세 -> 수정(삭제/추가) -> 삭제", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(300_000);

    await ensureAdminSession(page);
    const generation = await pickExistingGeneration(page.request);
    const generationPath = `/dashboard/${encodeURIComponent(generation.name.trim())}`;
    const title = uniqueText(e2ePrefix, "activity");
    const updatedTitle = `${title}-updated`;
    const escapedGenerationPath = generationPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    await page.goto(`${generationPath}/activities/new`);
    await expect(page).toHaveURL(new RegExp(`${escapedGenerationPath}/activities/new$`));
    await page.getByLabel("활동 제목").fill(title);
    await fillRichTextEditor(page, `${title} 본문`);
    await page.getByLabel("시작일").fill("2030-03-01");
    await page.getByLabel("종료일").fill("2030-03-03");

    const createFileInputs = page.locator("input[type='file']");
    await createFileInputs.nth(0).setInputFiles(sampleImagePath);
    await createFileInputs.nth(1).setInputFiles(sampleImagePath);

    await page.getByRole("button", { name: "활동 생성" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${escapedGenerationPath}/activities/[0-9a-f-]{36}$`, "i"),
      { timeout: 120_000 },
    );
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    const activityIdMatch = page.url().match(/\/activities\/([0-9a-f-]{36})(?:[/?#]|$)/i);
    expect(activityIdMatch).not.toBeNull();
    const activityId = activityIdMatch?.[1] as string;

    await page.getByRole("link", { name: "수정" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${escapedGenerationPath}/activities/${activityId}/edit(?:\\?.*)?$`, "i"),
    );

    const editTitleInput = page.getByLabel("활동 제목").first();
    await expect(editTitleInput).toBeVisible({ timeout: 120_000 });
    await editTitleInput.fill(updatedTitle);
    const editFileInputs = page.locator("input[type='file']");
    await editFileInputs.nth(1).setInputFiles(sampleImagePath);
    await page.getByRole("button", { name: "이미지 삭제" }).first().click();
    await page.getByRole("button", { name: "수정 저장" }).click();

    await expect(page).toHaveURL(
      new RegExp(`${escapedGenerationPath}/activities/${activityId}$`, "i"),
      { timeout: 120_000 },
    );
    await expect(page.getByText(updatedTitle)).toBeVisible();

    const deleteResponse = await page.request.delete(
      `${API_BASE_URL}/api/activities/${activityId}`,
    );
    expect(deleteResponse.status()).toBe(204);

    await page.goto(`${generationPath}/activities`);
    await expect(page.getByText(updatedTitle)).toHaveCount(0);
  });
});
