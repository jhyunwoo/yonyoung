import { expect, test } from "@playwright/test";

import { setMockSession } from "./support/session";
import { getMockState, resetMockState } from "./support/state-assert";

const MOCK_API_BASE_URL = "http://127.0.0.1:4010";

const makeNamespace = (projectName: string, parallelIndex: number, key: string): string =>
  `${projectName}-w${parallelIndex}-${key}`;

test.describe("attachments (첨부파일)", () => {
  test("donate page renders public attachment download links", async ({ page }) => {
    // 시드: attach-1 (site_donate scope, "2026년 상반기 회계 내역")
    await page.goto("/donate", { waitUntil: "domcontentloaded" });

    const attachmentList = page.getByTestId("donate-attachment-list");
    await expect(attachmentList).toBeVisible();

    const downloadLink = attachmentList.locator("a").first();
    await expect(downloadLink).toContainText("2026년 상반기 회계 내역");
    // <a download>로 한글 원본 파일명이 지정되어야 한다
    await expect(downloadLink).toHaveAttribute("download", "2026-상반기-회계내역.pdf");
    await expect(downloadLink).toHaveAttribute("href", /api\/public\/media/);
  });

  test("record detail page renders activity attachments", async ({ page }) => {
    // 시드: attach-2 (activity scope, act-1 소속)
    await page.goto("/archive/records/act-1", { waitUntil: "domcontentloaded" });

    const attachmentList = page.getByTestId("record-attachment-list");
    await expect(attachmentList).toBeVisible();
    await expect(attachmentList).toContainText("월간연영회 2026년 3월호");
  });

  test("president can create and delete a donate attachment through the API", async ({
    request,
  }, testInfo) => {
    const namespace = makeNamespace(
      testInfo.project.name,
      testInfo.parallelIndex,
      "attachments",
    );
    await resetMockState(request, namespace);

    const headers = {
      "x-mock-worker": namespace,
      "x-mock-role": "president",
    };

    const createResponse = await request.post(`${MOCK_API_BASE_URL}/api/attachments`, {
      headers,
      data: {
        scope: "site_donate",
        title: "E2E 회계 자료",
        fileUrl:
          "https://images.mock.local/api/public/media/site/user-president/file/e2e-report.pdf?sig=mock",
        fileName: "e2e-report.pdf",
        fileSize: 2048,
        mimeType: "application/pdf",
        sortOrder: 1,
      },
    });
    expect(createResponse.status()).toBe(201);

    const stateAfterCreate = await getMockState(request, namespace);
    const created = stateAfterCreate.attachments.find(
      (attachment) => attachment.title === "E2E 회계 자료",
    );
    expect(created).toBeDefined();

    const deleteResponse = await request.delete(
      `${MOCK_API_BASE_URL}/api/attachments/${created!.id}`,
      { headers },
    );
    expect(deleteResponse.ok()).toBe(true);

    const stateAfterDelete = await getMockState(request, namespace);
    expect(
      stateAfterDelete.attachments.some((attachment) => attachment.id === created!.id),
    ).toBe(false);
  });

  test("manager cannot manage donate attachments (site_donate is leadership-only)", async ({
    request,
  }, testInfo) => {
    const namespace = makeNamespace(
      testInfo.project.name,
      testInfo.parallelIndex,
      "attachments-rbac",
    );
    await resetMockState(request, namespace);

    const createResponse = await request.post(`${MOCK_API_BASE_URL}/api/attachments`, {
      headers: {
        "x-mock-worker": namespace,
        "x-mock-role": "manager",
      },
      data: {
        scope: "site_donate",
        title: "권한 없는 등록 시도",
        fileUrl:
          "https://images.mock.local/api/public/media/site/user-manager/file/x.pdf?sig=mock",
        fileName: "x.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
      },
    });
    expect(createResponse.status()).toBe(403);
  });

  test("admin site settings page shows the attachment manager", async ({
    page,
    context,
  }, testInfo) => {
    const namespace = makeNamespace(
      testInfo.project.name,
      testInfo.parallelIndex,
      "attachments-admin",
    );
    await setMockSession(context, { role: "president", namespace });

    await page.goto("/dashboard/settings/site", { waitUntil: "domcontentloaded" });

    const manager = page.getByTestId("attachment-manager");
    await expect(manager).toBeVisible();
    // 시드 첨부파일이 관리 목록에 노출된다
    await expect(page.getByTestId("attachment-list")).toContainText(
      "2026년 상반기 회계 내역",
    );
  });
});
