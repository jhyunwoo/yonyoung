import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("./auth-server", () => ({
  resolveAuthApiUrl: vi.fn(() => "http://api.example.com"),
}));

import { cookies } from "next/headers";
import { resolveAuthApiUrl } from "./auth-server";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "./admin-generation-server";

describe("admin-generation-server", () => {
  const mockCookies = vi.mocked(cookies);
  const mockResolveAuthApiUrl = vi.mocked(resolveAuthApiUrl);

  beforeEach(() => {
    mockCookies.mockReset();
    mockResolveAuthApiUrl.mockReturnValue("http://api.example.com");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("readServerCookieHeader는 쿠키가 있으면 cookie header 문자열을 반환한다", async () => {
    mockCookies.mockResolvedValue({
      toString: () => "a=1; b=2",
    } as Awaited<ReturnType<typeof cookies>>);

    const result = await readServerCookieHeader();
    expect(result).toBe("a=1; b=2");
  });

  it("readServerCookieHeader는 쿠키가 없으면 null을 반환한다", async () => {
    mockCookies.mockResolvedValue({
      toString: () => "",
    } as Awaited<ReturnType<typeof cookies>>);

    const result = await readServerCookieHeader();
    expect(result).toBeNull();
  });

  it("fetchGenerationsFromServer는 data envelope를 파싱한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "g1",
              name: "1기",
              sortOrder: 1,
            },
            {
              id: "invalid",
              sortOrder: "nope",
            },
          ],
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGenerationsFromServer("session=abc");
    expect(result).toEqual([
      {
        id: "g1",
        name: "1기",
        sortOrder: 1,
      },
    ]);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.example.com/api/generations");
    expect(options.method).toBe("GET");
    expect((options.headers as Headers).get("cookie")).toBe("session=abc");
    expect(mockResolveAuthApiUrl).toHaveBeenCalledTimes(1);
  });

  it("fetchGenerationsFromServer는 배열 payload도 파싱한다", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: "g1",
            name: "1기",
            sortOrder: 1,
          },
          {
            id: 123,
            name: "invalid",
            sortOrder: 2,
          },
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGenerationsFromServer(null);
    expect(result).toEqual([
      {
        id: "g1",
        name: "1기",
        sortOrder: 1,
      },
    ]);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Headers).has("cookie")).toBe(false);
  });

  it("fetchGenerationsFromServer는 실패 응답 또는 예외에서 빈 배열을 반환한다", async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const failedResult = await fetchGenerationsFromServer(null);
    const rejectedResult = await fetchGenerationsFromServer(null);

    expect(failedResult).toEqual([]);
    expect(rejectedResult).toEqual([]);
  });
});
