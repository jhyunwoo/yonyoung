import { expect, type APIRequestContext } from "@playwright/test";
import type { MockState } from "../mock-api/contracts";

const MOCK_API_BASE_URL = "http://127.0.0.1:4010";

export const resetMockState = async (
  request: APIRequestContext,
  namespace: string,
): Promise<void> => {
  const response = await request.post(`${MOCK_API_BASE_URL}/__test/reset`, {
    params: { namespace },
    headers: {
      "x-mock-worker": namespace,
    },
  });
  expect(response.ok()).toBe(true);
};

export const getMockState = async (
  request: APIRequestContext,
  namespace: string,
): Promise<MockState> => {
  const response = await request.get(`${MOCK_API_BASE_URL}/__test/state`, {
    params: { namespace },
    headers: {
      "x-mock-worker": namespace,
    },
  });

  expect(response.ok()).toBe(true);
  const json = (await response.json()) as { data: MockState };
  return json.data;
};

export const expectCollectionDelta = <T>(input: {
  before: T[];
  after: T[];
  delta: number;
}): void => {
  expect(input.after.length - input.before.length).toBe(input.delta);
};

/**
 * 웹 서버가 mock API 로 보낸 요청 수를 읽는다.
 *
 * 서버→API 왕복은 브라우저에서 보이지 않으므로, 네비게이션 1회당 왕복 수를
 * 확인하려면 API 쪽 계측기를 봐야 한다. mock API 의
 * `/__test/upstream-requests` 가 `"<METHOD> <PATH>" -> count` 를 돌려준다.
 */
export const readUpstreamRequestCounts = async (
  request: APIRequestContext,
  namespace: string,
): Promise<Record<string, number>> => {
  const response = await request.get(`${MOCK_API_BASE_URL}/__test/upstream-requests`, {
    params: { namespace },
    headers: { "x-mock-worker": namespace },
  });
  expect(response.ok()).toBe(true);
  const json = (await response.json()) as { counts?: Record<string, number> };
  return json.counts ?? {};
};

/** 계측기를 0으로 되돌린다. 측정 구간 직전에 호출한다. */
export const resetUpstreamRequestCounts = async (
  request: APIRequestContext,
  namespace: string,
): Promise<void> => {
  const response = await request.delete(`${MOCK_API_BASE_URL}/__test/upstream-requests`, {
    params: { namespace },
    headers: { "x-mock-worker": namespace },
  });
  expect(response.ok()).toBe(true);
};
