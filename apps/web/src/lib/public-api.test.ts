import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

const makeJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

describe("public-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.stubEnv("E2E_SUITE_MODE", "");
    vi.stubEnv("E2E_API_URL", "");
    vi.stubEnv("AUTH_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_URL", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("개발 환경에서는 localhost 기본 API URL을 사용한다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: [] }));
    const { listPublicPhotographers } = await import("./public-api");

    await listPublicPhotographers();

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8787/api/public/photographers",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("생산 환경에서 API 환경변수가 없으면 프로덕션 기본 URL을 사용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: [] }));
    const { listPublicPhotographers } = await import("./public-api");

    await listPublicPhotographers();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.yonyoung.moveto.kr/api/public/photographers",
      expect.any(Object),
    );
  });

  it("생산 환경에서 AUTH_API_URL이 있으면 해당 URL을 우선 사용한다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_API_URL", " https://api.example.com// ");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(makeJsonResponse({ data: [] }));
    const { listPublicPhotographers } = await import("./public-api");

    await listPublicPhotographers();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/api/public/photographers",
      expect.any(Object),
    );
  });

  it("공개 목록 API 호출 실패 시 빈 배열 fallback을 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fetch failed"));
    const { listPublicPhotographers } = await import("./public-api");

    await expect(listPublicPhotographers()).resolves.toEqual([]);
  });
});
