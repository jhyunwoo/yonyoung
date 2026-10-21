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
    // 에디터는 클라이언트에서만 뜨므로, 보이면 하이드레이션이 끝난 것이다. 그 전에 입력하면
    // 하이드레이션이 제어 input 값을 비워 버린다.
    await expect(page.locator(".ProseMirror")).toBeVisible();

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
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByTestId("generation-activity-delete")).toBeEnabled();

    const state = await getMockState(request, namespace);
    const created = state.activities.find((activity) => activity.title === title);
    expect(created?.detailImages).toHaveLength(DETAIL_IMAGE_COUNT);
  });

  test("활동 수정에서 세부 사진을 지우고 새 사진을 더해 저장한다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = `${testInfo.project.name}-w${testInfo.parallelIndex}-activity-edit`;
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });
    const before = await getMockState(request, namespace);
    const beforeImages =
      before.activities.find((activity) => activity.id === "act-1")?.detailImages ?? [];
    const removedImageId = beforeImages[0]?.id ?? "";

    await page.goto(`${GENERATION_PATH}/activities/act-1/edit`, {
      waitUntil: "domcontentloaded",
    });
    await routeUploadsToSameOrigin(page);
    // 에디터는 클라이언트에서만 뜨므로, 보이면 하이드레이션이 끝난 것이다. 그 전에 입력하면
    // 하이드레이션이 제어 input 값을 비워 버린다.
    await expect(page.locator(".ProseMirror")).toBeVisible();

    await page.getByTestId(`sortable-image-remove-${removedImageId}`).click();
    await page.locator('input[type="file"]').nth(1).setInputFiles(pngFile("added.png"));
    await page.getByTestId("activity-edit-submit").click();

    await page.waitForURL((url) => url.pathname.endsWith("/activities/act-1"), {
      timeout: 60_000,
    });

    const after = await getMockState(request, namespace);
    const afterImages =
      after.activities.find((activity) => activity.id === "act-1")?.detailImages ?? [];
    expect(afterImages).toHaveLength(beforeImages.length);
    expect(afterImages.map((image) => image.id)).not.toContain(removedImageId);
  });

  test("대표 사진과 세부 사진으로 전시를 만든다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = `${testInfo.project.name}-w${testInfo.parallelIndex}-exhibition-create`;
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });

    await page.goto(`${GENERATION_PATH}/exhibitions/new`, {
      waitUntil: "domcontentloaded",
    });
    await routeUploadsToSameOrigin(page);
    // 에디터는 클라이언트에서만 뜨므로, 보이면 하이드레이션이 끝난 것이다. 그 전에 입력하면
    // 하이드레이션이 제어 input 값을 비워 버린다.
    await expect(page.locator(".ProseMirror")).toBeVisible();

    const title = `전시 업로드 ${Date.now()}`;
    await page.getByPlaceholder("예: 연영회 60기 정기전").fill(title);
    await page.getByPlaceholder("예: 서울시립미술관").fill("학생회관");
    await page
      .getByPlaceholder("예: 서울특별시 마포구 월드컵북로1길 74")
      .fill("  서울특별시 서대문구 연세로 50  ");
    await page.locator(".ProseMirror").click();
    await page.keyboard.type("전시 설명");
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill("2030-05-01");
    await dateInputs.nth(1).fill("2030-05-03");

    const fileInputs = page.locator('input[type="file"]');
    await fileInputs.nth(0).setInputFiles(pngFile("cover.png"));
    await fileInputs.nth(1).setInputFiles([pngFile("d1.png"), pngFile("d2.png")]);

    await page.getByTestId("exhibition-create-submit").click();

    await page.waitForURL(
      (url) =>
        /\/exhibitions\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"),
      { timeout: 60_000 },
    );
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    const state = await getMockState(request, namespace);
    const created = state.exhibitions.find((exhibition) => exhibition.title === title);
    expect(created?.place).toBe("학생회관");
    expect(created?.placeAddress).toBe("서울특별시 서대문구 연세로 50");
    expect(created?.detailImages).toHaveLength(2);
  });
});
