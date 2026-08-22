import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readServerForwardedRequestContextMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/http/request-context", () => ({
  readServerForwardedRequestContext: readServerForwardedRequestContextMock,
}));

import {
  getAdminDashboardStats,
  listAdminActivities,
} from "@/features/dashboard/services/admin-read-service";

const ACTIVITY = {
  id: "20000000-0000-4000-8000-000000000001",
  title: "워크숍",
  description: "<p>설명</p>",
  startDate: 1735689600000,
  endDate: 1735689600000,
  coverImageUrl: "https://example.com/cover.jpg",
  generationId: "10000000-0000-4000-8000-000000000001",
  createdAt: 1735689600000,
  updatedAt: 1735689600000,
  updatedBy: null,
  detailImages: [],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("admin read service", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    readServerForwardedRequestContextMock.mockResolvedValue({
      host: "yonyoung.example",
      protocol: "https",
      origin: "https://yonyoung.example",
    });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("성공 응답은 계약 스키마로 검증한 데이터를 돌려준다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [ACTIVITY] }));

    const result = await listAdminActivities("generation-id", null);

    expect(result.ok).toBe(true);
    expect(result.ok && result.data).toHaveLength(1);
  });

  it("관리자 읽기는 항상 no-store로 요청한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await listAdminActivities("generation-id", null);

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });

  it("빈 목록과 읽기 실패를 구분해서 돌려준다", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    const empty = await listAdminActivities("generation-id", null);
    expect(empty).toEqual({ ok: true, data: [] });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { message: "서버 오류" } }, 500),
    );
    const failed = await listAdminActivities("generation-id", null);
    expect(failed.ok).toBe(false);
    expect(failed.ok === false && failed.error).toMatchObject({
      reason: "request_failed",
      status: 500,
      message: "서버 오류",
    });
  });

  it("HTTP 상태를 읽기 실패 사유로 분류한다", async () => {
    for (const [status, reason] of [
      [401, "unauthorized"],
      [403, "forbidden"],
      [404, "not_found"],
      [502, "request_failed"],
    ] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, status));
      const result = await listAdminActivities("generation-id", null);
      expect(result.ok === false && result.error.reason).toBe(reason);
    }
  });

  it("계약과 맞지 않는 응답은 성공으로 취급하지 않는다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: [{ ...ACTIVITY, startDate: "2025-01-01" }] }),
    );

    const result = await listAdminActivities("generation-id", null);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error.reason).toBe("invalid_response");
  });

  it("네트워크 예외도 결과 타입으로 돌려준다", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await listAdminActivities("generation-id", null);

    expect(result).toEqual({
      ok: false,
      error: { reason: "request_failed", message: "network down", status: null },
    });
  });

  it("generationSortOrder가 있으면 쿼리에 담아 보낸다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }, 404));

    await getAdminDashboardStats(null, 12);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "generationSortOrder=12",
    );
  });

  it("generationSortOrder가 없으면 쿼리를 붙이지 않는다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: null }, 404));

    await getAdminDashboardStats(null, null);

    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain("?");
  });

  it("쿠키 헤더가 있으면 그대로 전달한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

    await listAdminActivities("generation-id", "session=abc");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Headers).get("cookie")).toBe("session=abc");
  });
});
