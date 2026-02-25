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

test.describe("exhibitions crud", () => {
  test.afterEach(async ({ page, e2ePrefix }) => {
    await ensureAdminSession(page);
    await cleanupByPrefix(page.request, e2ePrefix);
  });

  test("전시 생성 -> 상세 -> 수정 -> sanitize 확인 -> 삭제", async ({
    page,
    e2ePrefix,
    sampleImagePath,
  }) => {
    test.setTimeout(300_000);

    await ensureAdminSession(page);
    const generation = await pickExistingGeneration(page.request);
    const generationPath = `/dashboard/${encodeURIComponent(generation.name.trim())}`;
    const title = uniqueText(e2ePrefix, "exhibition");
    const updatedTitle = `${title}-updated`;
    const escapedGenerationPath = generationPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    await page.goto(`${generationPath}/exhibitions/new`);
    await expect(page).toHaveURL(new RegExp(`${escapedGenerationPath}/exhibitions/new$`));
    await page.getByLabel("전시 제목").fill(title);
    await page.getByLabel("전시 장소").fill("서울시립미술관");
    await fillRichTextEditor(page, `${title} 소개 본문`);
    await page.getByLabel("시작일").fill("2030-04-01");
    await page.getByLabel("종료일").fill("2030-04-10");

    const createFileInputs = page.locator("input[type='file']");
    await createFileInputs.nth(0).setInputFiles(sampleImagePath);
    await createFileInputs.nth(1).setInputFiles(sampleImagePath);

    await page.getByRole("button", { name: "전시 생성" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${escapedGenerationPath}/exhibitions/[0-9a-f-]{36}$`, "i"),
      { timeout: 120_000 },
    );
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    const exhibitionIdMatch = page.url().match(/\/exhibitions\/([0-9a-f-]{36})(?:[/?#]|$)/i);
    expect(exhibitionIdMatch).not.toBeNull();
    const exhibitionId = exhibitionIdMatch?.[1] as string;

    await page.getByRole("link", { name: "수정" }).click();
    await expect(page).toHaveURL(new RegExp(`${escapedGenerationPath}/exhibitions/${exhibitionId}/edit$`, "i"));

    await page.getByLabel("전시 제목").fill(updatedTitle);
    const editFileInputs = page.locator("input[type='file']");
    await editFileInputs.nth(1).setInputFiles(sampleImagePath);
    await page.getByRole("button", { name: "이미지 삭제" }).first().click();
    await page.getByRole("button", { name: "수정 저장" }).click();
    await expect(page).toHaveURL(
      new RegExp(`${escapedGenerationPath}/exhibitions/${exhibitionId}$`, "i"),
      { timeout: 120_000 },
    );
    await expect(page.getByText(updatedTitle)).toBeVisible();

    const sanitizeResponse = await page.request.patch(
      `${API_BASE_URL}/api/exhibitions/${exhibitionId}`,
      {
        data: {
          description:
            '<h2>섹션</h2><script>alert(1)</script><p onclick="evil()">본문</p><a href="javascript:alert(1)">bad</a>',
        },
      },
    );
    expect(sanitizeResponse.status()).toBe(200);

    const sanitizedReadResponse = await page.request.get(
      `${API_BASE_URL}/api/exhibitions/${exhibitionId}`,
    );
    expect(sanitizedReadResponse.status()).toBe(200);
    const sanitizedReadBody = (await sanitizedReadResponse.json()) as {
      data?: { description?: string };
    };
    const sanitizedDescription = sanitizedReadBody.data?.description ?? "";
    expect(sanitizedDescription).not.toContain("<script");
    expect(sanitizedDescription).not.toContain("onclick=");
    expect(sanitizedDescription).not.toContain("javascript:");

    await page.goto(`${generationPath}/exhibitions/${exhibitionId}`);
    const detailCard = page.locator("section .rounded-xl.border.border-slate-200.p-4").first();
    await expect(detailCard.locator("script")).toHaveCount(0);
    await expect(detailCard.locator("[onclick]")).toHaveCount(0);
    await expect(detailCard.locator("a[href^='javascript:']")).toHaveCount(0);
    await expect(page.getByText("본문")).toBeVisible();

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(new RegExp(`${generationPath}/exhibitions$`), {
      timeout: 120_000,
    });
  });
});
