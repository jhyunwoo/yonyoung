import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import {
  cleanupByPrefix,
  ensureAdminSession,
  pickExistingGeneration,
  uniqueText,
} from "./helpers";

const fillRichTextEditor = async (page: Page, text: string) => {
  const editor = page.locator("[contenteditable='true']").first();
  await editor.click();
  await editor.press("Control+A");
  await editor.type(text);
};

test.describe("notices file upload", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("글로벌 공지는 URL 입력 없이 파일 업로드로 작성/수정할 수 있다", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(300_000);

    await ensureAdminSession(page);

    const title = uniqueText(e2ePrefix, "global-notice");
    const updatedTitle = `${title}-updated`;

    await page.goto("/dashboard/settings/notices/new");
    await expect(page.getByText("URL 추가")).toHaveCount(0);
    await expect(page.getByPlaceholder("https://...")).toHaveCount(0);

    await page.getByPlaceholder("공지 제목").first().fill(title);
    await fillRichTextEditor(page, `${title} 본문`);
    await page
      .locator("label:has-text('파일 업로드') input[type='file']")
      .first()
      .setInputFiles(sampleImagePath);

    await page.getByRole("button", { name: "공지 등록" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/notices\/[0-9a-f-]{36}$/i, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();

    await page.getByRole("link", { name: "수정 페이지로 이동" }).click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/notices\/[^/]+\/edit$/);
    await expect(page.getByText("URL 추가")).toHaveCount(0);
    await expect(page.getByPlaceholder("https://...")).toHaveCount(0);

    await page.getByPlaceholder("공지 제목").first().fill(updatedTitle);
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page).toHaveURL(/\/dashboard\/settings\/notices\/[0-9a-f-]{36}$/i, {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { level: 2, name: updatedTitle })).toBeVisible();
  });

  test("기수 공지는 파일 업로드 작성 후 인라인 수정/삭제가 동작한다", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(300_000);

    await ensureAdminSession(page);
    const generation = await pickExistingGeneration(page.request);
    const generationPath = `/dashboard/${encodeURIComponent(generation.name.trim())}`;
    const escapedGenerationPath = generationPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const title = uniqueText(e2ePrefix, "generation-notice");
    const updatedTitle = `${title}-updated`;

    await page.goto(`${generationPath}/notices/new`);
    await expect(page.getByText("URL 추가")).toHaveCount(0);
    await expect(page.getByPlaceholder("https://...")).toHaveCount(0);

    await page.getByPlaceholder("공지 제목").first().fill(title);
    await fillRichTextEditor(page, `${title} 본문`);
    await page
      .locator("label:has-text('파일 업로드') input[type='file']")
      .first()
      .setInputFiles(sampleImagePath);

    await page.getByRole("button", { name: "공지 등록" }).click();
    await expect(page).toHaveURL(new RegExp(`${escapedGenerationPath}/notices/[0-9a-f-]{36}$`, "i"), {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();

    await page.getByRole("button", { name: "인라인 수정" }).click();
    await page.getByRole("textbox").first().fill(updatedTitle);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByRole("heading", { level: 2, name: updatedTitle })).toBeVisible({
      timeout: 30_000,
    });

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(new RegExp(`${escapedGenerationPath}/notices$`), {
      timeout: 30_000,
    });
  });
});
