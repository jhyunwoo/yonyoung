import { expect, test } from "@playwright/test";

import { setMockSession } from "./support/session";
import { resetMockState } from "./support/state-assert";

/*
  관리자 읽기 실패 회귀 테스트.

  사이트 설정을 읽지 못했을 때 예전 폼은 예시 기본값(예시은행 등)을 채운 채 저장 버튼을
  열어 두었다. 저장 한 번이면 실제 연락처·후원 계좌가 예시 값으로 덮어써졌다.
  이제는 읽기 실패 안내만 보이고 저장 버튼이 없어야 한다.
*/
test.describe("관리자 읽기 실패", () => {
  test("사이트 설정을 읽지 못하면 기본값 폼 대신 오류를 보여 준다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const namespace = `${testInfo.project.name}-w${testInfo.parallelIndex}-site-settings-failure`;
    await resetMockState(request, namespace);
    await setMockSession(context, { role: "president", namespace });
    await context.addCookies([
      {
        name: "mock_fail",
        value: "site-settings",
        domain: "127.0.0.1",
        path: "/",
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/settings/site", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("site-settings-load-error")).toBeVisible();
    await expect(page.getByTestId("site-settings-submit")).toHaveCount(0);
  });
});
