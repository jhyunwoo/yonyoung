import { expect, test } from "@playwright/test";

import { setMockSession } from "./support/session";
import {
  readUpstreamRequestCounts,
  resetMockState,
  resetUpstreamRequestCounts,
} from "./support/state-assert";

/*
  대시보드 인증 임계 경로 회귀 테스트.

  예전에는 `proxy.ts` 가 `GET /api/auth/get-session` 을 직접 호출하고, 이어서 렌더가
  시작되면 대시보드 레이아웃이 같은 엔드포인트를 다시 불렀다. React `cache()` 는 렌더
  안에서만 dedupe 하므로 프록시에서 나간 왕복은 없애지 못했고, `apps/api` 는 별도
  오리진(Cloudflare Worker)이라 그 한 번이 그대로 지연으로 들어왔다.

  이 테스트는 "대시보드 진입 1회당 세션 왕복 1회"를 고정한다. 프록시에 네트워크
  검사를 다시 넣거나 `cache()` 밖에서 세션을 읽으면 여기서 깨진다.

  왕복 수는 반드시 API 쪽에서 세야 한다 — 서버→API 호출은 브라우저에 보이지 않는다.
*/

const namespace = (
  testName: string,
  projectName: string,
  parallelIndex: number,
): string => `${projectName}-w${parallelIndex}-${testName}`;

const SESSION_KEY = "GET /api/auth/get-session";

test.describe("대시보드 세션 왕복", () => {
  test("대시보드 진입에 세션 API 왕복은 1회다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace("session-once", testInfo.project.name, testInfo.parallelIndex);
    await resetMockState(request, ns);
    await setMockSession(context, { role: "president", namespace: ns });
    await resetUpstreamRequestCounts(request, ns);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("연영회에 오신 것을 환영합니다.")).toBeVisible();

    const counts = await readUpstreamRequestCounts(request, ns);
    expect(counts[SESSION_KEY] ?? 0).toBe(1);
  });

  test("대시보드 안에서 이동해도 세션 API 왕복은 1회다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace("session-nav", testInfo.project.name, testInfo.parallelIndex);
    await resetMockState(request, ns);
    await setMockSession(context, { role: "president", namespace: ns });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("연영회에 오신 것을 환영합니다.")).toBeVisible();

    // 여기부터가 측정 구간이다 — 진입 비용은 세지 않는다.
    await resetUpstreamRequestCounts(request, ns);

    await page.goto("/dashboard/settings/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("site-settings-submit")).toBeVisible();

    const counts = await readUpstreamRequestCounts(request, ns);
    expect(counts[SESSION_KEY] ?? 0).toBe(1);
  });

  test("인증되지 않은 접근은 세션 왕복 1회 안에 차단된다", async ({
    page,
    context,
    request,
  }, testInfo) => {
    const ns = namespace("session-guest", testInfo.project.name, testInfo.parallelIndex);
    await resetMockState(request, ns);
    await setMockSession(context, { role: "guest", namespace: ns });
    await resetUpstreamRequestCounts(request, ns);

    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();

    // 프록시가 인가 경계가 아니게 된 뒤에도 차단은 유지돼야 한다.
    if (!page.url().includes("/auth/sign-in")) {
      expect(response?.status()).toBe(403);
      await expect(page.getByTestId("dashboard-forbidden-page")).toBeVisible();
    }

    const counts = await readUpstreamRequestCounts(request, ns);
    expect(counts[SESSION_KEY] ?? 0).toBeLessThanOrEqual(1);
  });
});
