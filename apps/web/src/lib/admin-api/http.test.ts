import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@repo/shared-http";
import { adminRequest } from "./http";

const makeJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const makeTextResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });

describe("adminRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("개발 환경에서 기본 API URL과 데이터 envelope를 사용한다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: { id: "activity-1" } }));

    const result = await adminRequest<{ id: string }>("/activities", "GET");

    expect(result).toEqual({ id: "activity-1" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8787/api/activities",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
  });

  it("본문이 있는 요청은 JSON 헤더와 body를 포함한다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: { ok: true } }));

    await adminRequest("/activities", "POST", { title: "새 활동" });

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.headers).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    expect(requestInit.body).toBe(JSON.stringify({ title: "새 활동" }));
  });

  it("204 응답은 undefined를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    const result = await adminRequest<void>("/activities/activity-1", "DELETE");
    expect(result).toBeUndefined();
  });

  it("data envelope가 없는 성공 응답은 원문을 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse({ uploadUrl: "https://example.com/upload" }),
    );

    const result = await adminRequest<{ uploadUrl: string }>(
      "/uploads/presign",
      "POST",
      { fileName: "a.png" },
    );

    expect(result.uploadUrl).toContain("example.com");
  });

  it("생산 환경에서는 NEXT_PUBLIC_AUTH_API_URL을 우선 사용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_URL", " https://api.example.com// ");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: { ok: true } }));

    await adminRequest("health", "GET");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/api/health",
      expect.any(Object),
    );
  });

  it("생산 환경에서 환경변수가 없으면 기본 프로덕션 URL을 사용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_URL", "");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: { ok: true } }));

    await adminRequest("/health", "GET");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.yonyoung.moveto.kr/api/health",
      expect.any(Object),
    );
  });

  it("오류 envelope가 있으면 AdminApiError(code/message)를 던진다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse(
        {
          error: {
            code: "FORBIDDEN",
            message: "권한이 없습니다.",
          },
        },
        403,
      ),
    );

    await expect(adminRequest("/activities", "GET")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "권한이 없습니다.",
    });
  });

  it("오류 envelope가 없어도 message 필드가 있으면 그 메시지를 사용한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeJsonResponse({ message: "실패" }, 400),
    );

    await expect(adminRequest("/activities", "GET")).rejects.toMatchObject({
      status: 400,
      message: "실패",
    });
  });

  it("오류 응답이 텍스트면 기본 HTTP 실패 메시지를 사용한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeTextResponse("failed", 502),
    );

    await expect(adminRequest("/activities", "GET")).rejects.toMatchObject({
      status: 502,
      message: "요청 처리에 실패했습니다. (HTTP 502)",
    });
  });

  it("AbortError는 TIMEOUT 오류로 매핑한다", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(abortError);

    await expect(adminRequest("/activities", "GET")).rejects.toMatchObject({
      status: 408,
      code: "TIMEOUT",
    });
  });

  it("알 수 없는 예외는 UNKNOWN 오류로 매핑한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));

    await expect(adminRequest("/activities", "GET")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
      message: "boom",
    });
  });

  it("AdminApiError는 그대로 재던진다", async () => {
    const apiError = new AdminApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증 필요",
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(apiError);

    await expect(adminRequest("/activities", "GET")).rejects.toBe(apiError);
  });
});
