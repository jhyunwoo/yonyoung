import { afterEach, describe, expect, it, vi } from "vitest";

const captureRequestError = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({ captureRequestError }));
const logError = vi.hoisted(() => vi.fn());
vi.mock("@/server/observability/logger", () => ({
  logger: { info: vi.fn(), error: logError },
}));

import { onRequestError } from "../../instrumentation";

type RequestErrorArgs = Parameters<typeof onRequestError>;

const report = (method: string, path: string, routePath: string): void => {
  const request: RequestErrorArgs[1] = { method, path, headers: {} };
  const context: RequestErrorArgs[2] = {
    routerKind: "App Router",
    routePath,
    routeType: "render",
    renderSource: "react-server-components",
    revalidateReason: undefined,
  };
  void onRequestError(new Error("boom"), request, context);
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("onRequestError", () => {
  // 스캐너가 없는 경로(.php, .jsp 등)로 multipart POST를 보내면 Next가 서버 액션으로
  // 파싱하다 실패한다(YONYOUNG-WEB-2·4·5·6). 사이트 결함이 아니므로 Sentry에 올리지 않는다.
  it("does not report POSTs that landed on the not-found page", () => {
    report("POST", "/app/upload.php", "/_not-found/page");
    expect(captureRequestError).not.toHaveBeenCalled();
  });

  it("still reports failures rendering the not-found page itself", () => {
    report("GET", "/missing", "/_not-found/page");
    expect(captureRequestError).toHaveBeenCalledTimes(1);
  });

  it("still reports POSTs to real routes", () => {
    report("POST", "/dashboard/stats", "/(dashboard)/dashboard/stats/page");
    expect(captureRequestError).toHaveBeenCalledTimes(1);
  });

  // OAuth 콜백·동의 화면 주소에는 code, state, 서명된 oauth_query가 실린다.
  it("logs the path without its query string", () => {
    report(
      "GET",
      "/auth/mcp-consent?client_id=abc&sig=secret-signature",
      "/(dashboard)/auth/mcp-consent/page",
    );

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]?.[0]).toMatchObject({
      request: { path: "/auth/mcp-consent" },
    });
  });
});
