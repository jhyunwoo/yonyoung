import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", /** vi.mock 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => ({
  cookies: vi.fn(),
}));

vi.mock("./auth-server", /** vi.mock 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => ({
  resolveAuthApiUrl: vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => "http://api.example.com"),
}));

import { cookies } from "next/headers";
import { resolveAuthApiUrl } from "./auth-server";
import {
  fetchGenerationsFromServer,
  readServerCookieHeader,
} from "./admin-generation-server";

describe("admin-generation-server", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  const mockCookies = vi.mocked(cookies);
  const mockResolveAuthApiUrl = vi.mocked(resolveAuthApiUrl);

  beforeEach(/** beforeEach 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    mockCookies.mockReset();
    mockResolveAuthApiUrl.mockReturnValue("http://api.example.com");
  });

  afterEach(/** afterEach 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    vi.restoreAllMocks();
  });

  it("readServerCookieHeader는 쿠키가 있으면 cookie header 문자열을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    mockCookies.mockResolvedValue({
            /**
       * toString의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      toString: () => "a=1; b=2",
    } as Awaited<ReturnType<typeof cookies>>);

    const result = await readServerCookieHeader();
    expect(result).toBe("a=1; b=2");
  });

  it("readServerCookieHeader는 쿠키가 없으면 null을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    mockCookies.mockResolvedValue({
            /**
       * toString의 핵심 비즈니스 로직을 수행합니다.
       * @returns 함수 실행 결과를 반환합니다.
       * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
       */
      toString: () => "",
    } as Awaited<ReturnType<typeof cookies>>);

    const result = await readServerCookieHeader();
    expect(result).toBeNull();
  });

  it("fetchGenerationsFromServer는 data envelope를 파싱한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const fetchMock = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () =>
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

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("expected fetch call");
    }
    const [url, options] = firstCall as unknown as [string, RequestInit];
    expect(url).toBe("http://api.example.com/api/public/generations");
    expect(options.method).toBe("GET");
    expect((options.headers as Record<string, string>).cookie).toBeUndefined();
    expect((options as RequestInit & { next?: { tags?: string[] } }).next?.tags).toEqual([
      "admin:generations",
    ]);
    expect(mockResolveAuthApiUrl).toHaveBeenCalledTimes(1);
  });

  it("fetchGenerationsFromServer는 배열 payload도 파싱한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
    const fetchMock = vi.fn(/** vi.fn 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () =>
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

    const firstCall = fetchMock.mock.calls[0];
    if (!firstCall) {
      throw new Error("expected fetch call");
    }
    const [, options] = firstCall as unknown as [string, RequestInit];
    expect((options.headers as Record<string, string>).cookie).toBeUndefined();
  });

  it("fetchGenerationsFromServer는 실패 응답 또는 예외에서 빈 배열을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 비동기 처리 결과를 Promise로 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ async () => {
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
