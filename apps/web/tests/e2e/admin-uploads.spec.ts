import { expect, test, type Page } from "@playwright/test";

import { MOCK_UPLOAD_RESERVATION_LIMIT } from "./mock-api/upload-reservation-handlers";
import { setMockSession } from "./support/session";
import { getMockState, resetMockState } from "./support/state-assert";

/*
  관리자 업로드 회귀 테스트.

  API는 관리자 1명당 동시 업로드 예약을 10건으로 제한한다. 예전 웹은 세부 이미지를
  전부 한꺼번에 presign 해서 11장부터 409로 저장 전체가 실패했다. mock API도 같은 한도를
  두고(`mock-api/upload-reservation-handlers.ts`) 한도보다 많은 사진으로 활동을 만든다.

  CSP connect-src는 동일 출처와 R2만 허용하므로, presign 응답의 업로드 URL을 같은 출처의
  가짜 경로로 바꾸고 그 PUT을 브라우저 단에서 200으로 응답한다. 예약·정산 흐름 자체는
  실제 BFF → mock API를 그대로 거친다.
*/

const GENERATION_PATH = `/dashboard/${encodeURIComponent("59기")}`;
const DETAIL_IMAGE_COUNT = MOCK_UPLOAD_RESERVATION_LIMIT + 2;

// 1×1 PNG
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const pngFile = (name: string) => ({ name, mimeType: "image/png", buffer: PNG_BYTES });

const routeUploadsToSameOrigin = async (page: Page) => {
  await page.route("**/api/*/presign/**", async (route) => {
    const upstream = await route.fetch();
    if (!upstream.ok()) {
      await route.fulfill({ response: upstream });
      return;
    }

    const json = (await upstream.json()) as {
      data: { uploadUrl: string; objectKey: string };
    };
    json.data.uploadUrl = new URL(
      `/__e2e-upload/${encodeURIComponent(json.data.objectKey)}`,
      page.url(),
    ).toString();
    await route.fulfill({ response: upstream, json });
  });
  await page.route("**/__e2e-upload/**", (route) => route.fulfill({ status: 200 }));
};

test.describe("관리자 업로드", () => {
  test("예약 한도보다 많은 세부 사진으로도 활동을 만들 수 있다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = `${testInfo.project.name}-w${testInfo.parallelIndex}-bulk-upload`;
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    await page.goto(`${GENERATION_PATH}/activities/new`, {
      waitUntil: "domcontentloaded",
    });
    await routeUploadsToSameOrigin(page);

    const title = `대량 업로드 ${Date.now()}`;
    await page.getByPlaceholder("예: 60기 정기 촬영 워크숍").fill(title);
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("세부 사진이 많은 활동");
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill("2030-03-01");
    await dateInputs.nth(1).fill("2030-03-02");

    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(pngFile("cover.png"));
    await fileInputs
      .nth(1)
      .setInputFiles(
        Array.from({ length: DETAIL_IMAGE_COUNT }, (_, index) =>
          pngFile(`detail-${index}.png`),
        ),
      );

    await page.getByTestId("activity-create-submit").click();

    await page.waitForURL(
      (url) =>
        /\/activities\/[^/]+$/.test(url.pathname) &&
        !url.pathname.endsWith("/new") &&
        !url.pathname.endsWith("/edit"),
      { timeout: 60_000 },
    );

    const state = await getMockState(request, namespace);
    const created = state.activities.find((activity) => activity.title === title);
    expect(created?.detailImages).toHaveLength(DETAIL_IMAGE_COUNT);
  });
});
