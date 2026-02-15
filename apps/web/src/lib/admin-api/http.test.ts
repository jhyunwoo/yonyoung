import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest } from "./http";
import { AdminApiError } from "./types";

describe("adminRequest", () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_AUTH_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_AUTH_API_URL = "http://api.example.com/";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_API_URL;
    } else {
      process.env.NEXT_PUBLIC_AUTH_API_URL = originalBaseUrl;
    }
  });

  it("GET 요청은 data envelope를 언랩해서 반환한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "g1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await adminRequest<Array<{ id: string }>>("/generations", "GET");
    expect(result).toEqual([{ id: "g1" }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.example.com/api/generations");
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("include");
    expect(options.cache).toBe("no-store");
    expect(options.body).toBeUndefined();
    expect(options.headers).toEqual({ Accept: "application/json" });
  });

  it("POST 요청은 본문을 전송하고 일반 JSON도 그대로 반환한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await adminRequest<{ ok: boolean }>("linktree", "POST", {
      name: "new-linktree",
    });
    expect(result).toEqual({ ok: true });

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.example.com/api/linktree");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(JSON.stringify({ name: "new-linktree" }));
    expect(options.headers).toEqual({
      "Content-Type": "application/json",
      Accept: "application/json",
    });
  });

  it("204 응답은 undefined를 반환한다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await adminRequest<void>("/generations/id", "DELETE");
    expect(result).toBeUndefined();
  });

  it("표준 error envelope 응답은 AdminApiError로 매핑한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminRequest("/users", "GET")).rejects.toMatchObject({
      name: "AdminApiError",
      status: 403,
      code: "FORBIDDEN",
      message: "권한이 없습니다.",
    });
  });

  it("message 필드만 있는 JSON 에러도 AdminApiError로 매핑한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: "세션이 만료되었습니다." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminRequest("/users", "GET")).rejects.toMatchObject({
      status: 401,
      code: "UNKNOWN",
      message: "세션이 만료되었습니다.",
    });
  });

  it("비 JSON 에러 응답은 HTTP 상태 기반 기본 메시지를 사용한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("bad gateway", {
        status: 502,
        headers: { "content-type": "text/plain" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminRequest("/users", "GET")).rejects.toMatchObject({
      status: 502,
      code: "UNKNOWN",
      message: "요청 처리에 실패했습니다. (HTTP 502)",
    });
  });

  it("AbortError는 TIMEOUT 코드(408)로 변환한다", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchMock = vi.fn(async () => {
      throw abortError;
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminRequest("/users", "GET")).rejects.toMatchObject({
      status: 408,
      code: "TIMEOUT",
    });
  });

  it("예상치 못한 런타임 예외는 UNKNOWN(500)으로 매핑한다", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminRequest("/users", "GET")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
      message: "network down",
    });
  });

  it("throw된 AdminApiError는 래핑하지 않고 그대로 전달한다", async () => {
    const originalError = new AdminApiError({
      status: 499,
      code: "CUSTOM",
      message: "custom message",
    });
    const fetchMock = vi.fn(async () => {
      throw originalError;
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminRequest("/users", "GET")).rejects.toBe(originalError);
  });
});
