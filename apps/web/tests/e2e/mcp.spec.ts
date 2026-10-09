import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { setMockSession } from "./support/session";

// 모의 서버는 네임스페이스별 상태를 프로세스 안에 유지한다. 재시도와 반복 실행이
// 앞선 시도의 해제 결과를 보지 않도록 시도마다 새 네임스페이스를 쓴다.
const uniqueNamespace = (prefix: string) =>
  `${prefix}-${test.info().project.name}-${test.info().retry}-${randomUUID().slice(0, 8)}`;

test.describe("AI 연결", () => {
  test("부원은 안내 페이지에서 읽기 작업과 연결을 본다", async ({ context, page }) => {
    await setMockSession(context, { role: "member", namespace: "mcp-member" });
    await page.goto("/dashboard/mcp");

    await expect(
      page.getByRole("heading", { name: "Claude·ChatGPT에서 대시보드 쓰기" }),
    ).toBeVisible();
    await expect(
      page.locator("code", { hasText: "https://api.yonyoung.example/mcp" }),
    ).toBeVisible();
    await expect(page.getByText("활동 목록", { exact: true })).toBeVisible();
    await expect(page.getByText("활동 삭제", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Claude", { exact: true })).toBeVisible();
  });

  test("연결 해제를 확인하면 목록에서 사라진다", async ({ context, page }) => {
    await setMockSession(context, {
      role: "manager",
      namespace: uniqueNamespace("mcp-revoke"),
    });
    await page.goto("/dashboard/mcp");

    await page.getByRole("button", { name: "연결 해제" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "연결 해제" }).click();
    await expect(page.getByText("연결된 앱이 없습니다")).toBeVisible();
  });

  test("동의 화면은 앱 이름과 역할을 보여준다", async ({ context, page }) => {
    await setMockSession(context, { role: "manager", namespace: "mcp-consent" });
    await page.goto(
      "/auth/mcp-consent?client_id=claude-client&scope=openid+mcp&exp=1&sig=abc",
    );

    await expect(page.getByRole("heading", { name: "Claude 연결" })).toBeVisible();
    await expect(page.getByText("부장 권한으로")).toBeVisible();
    await expect(page.getByRole("button", { name: "허용" })).toBeEnabled();
  });

  test("승인 대기 사용자는 허용할 수 없다", async ({ context, page }) => {
    await setMockSession(context, { role: "unverified", namespace: "mcp-pending" });
    await page.goto(
      "/auth/mcp-consent?client_id=claude-client&scope=openid+mcp&exp=1&sig=abc",
    );

    await expect(page.getByText("관리자 승인 대기 중")).toBeVisible();
    await expect(page.getByRole("button", { name: "허용" })).toBeDisabled();
  });

  test("휴대폰 너비에서 가로 스크롤이 없다", async ({ context, page }) => {
    await setMockSession(context, {
      role: "member",
      namespace: uniqueNamespace("mcp-mobile"),
    });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/dashboard/mcp");
    await expect(
      page.locator("code", { hasText: "deliberately/long/path" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("업로드 페이지에서 같은 파일을 올리면 완료된다", async ({ context, page }) => {
    await setMockSession(context, { role: "manager", namespace: "mcp-upload" });
    await page.route("http://127.0.0.1:4010/mcp/uploads/valid-token", async (route) => {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "PUT",
        "access-control-allow-headers": "content-type",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({ data: { uploadId: "upload-1", status: "completed" } }),
      });
    });
    await page.goto("/dashboard/mcp/upload/valid-token");

    await page.getByLabel("올릴 파일").setInputFiles({
      name: "봄출사.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    await expect(page.getByText("올렸습니다")).toBeVisible();
  });

  test("다른 크기의 파일은 올리기 전에 막는다", async ({ context, page }) => {
    await setMockSession(context, { role: "manager", namespace: "mcp-upload-mismatch" });
    await page.goto("/dashboard/mcp/upload/valid-token");
    await page.getByLabel("올릴 파일").setInputFiles({
      name: "다른사진.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xd9]),
    });
    await expect(page.getByText("크기가 다릅니다")).toBeVisible();
  });

  test("다른 계정의 업로드 주소는 쓸 수 없다고 알려준다", async ({ context, page }) => {
    await setMockSession(context, { role: "manager", namespace: "mcp-upload-stranger" });
    await page.goto("/dashboard/mcp/upload/unknown-token");
    await expect(page.getByText("업로드 주소를 쓸 수 없습니다")).toBeVisible();
  });

  test("업로드가 실패해도 같은 파일을 다시 골라 올릴 수 있다", async ({
    context,
    page,
  }) => {
    await setMockSession(context, {
      role: "manager",
      namespace: uniqueNamespace("mcp-upload-retry"),
    });
    let puts = 0;
    await page.route("http://127.0.0.1:4010/mcp/uploads/valid-token", async (route) => {
      const cors = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "PUT",
        "access-control-allow-headers": "content-type",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      puts += 1;
      if (puts === 1) {
        await route.fulfill({
          status: 500,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify({ error: { message: "저장소에 쓰지 못했습니다." } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: cors,
        contentType: "application/json",
        body: JSON.stringify({ data: { uploadId: "upload-1", status: "completed" } }),
      });
    });
    await page.goto("/dashboard/mcp/upload/valid-token");

    const file = {
      name: "봄출사.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    };
    await page.getByLabel("올릴 파일").setInputFiles(file);
    await expect(page.getByText("저장소에 쓰지 못했습니다.")).toBeVisible();

    await page.getByLabel("올릴 파일").setInputFiles(file);
    await expect(page.getByText("올렸습니다")).toBeVisible();
  });
});
