import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as HonoClient from "@/server/http/hono-client";

const cacheLife = vi.fn<(profile: string) => void>();
const honoRequest = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  cacheLife: (profile: string) => cacheLife(profile),
  cacheTag: () => {},
}));
vi.mock("@/server/http/hono-client", async () => {
  const actual = await vi.importActual<typeof HonoClient>("@/server/http/hono-client");
  return {
    HonoApiError: actual.HonoApiError,
    honoRequest: (...args: unknown[]) => honoRequest(...args),
  };
});

const { HonoApiError } = await import("@/server/http/hono-client");
const { getPublicActivityById, getPublicExhibitionById } =
  await import("@/features/public/services/public-read-service");

const readers = [
  ["활동", getPublicActivityById],
  ["전시", getPublicExhibitionById],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(readers)("공개 %s 상세 읽기", (_label, read) => {
  // /archive/records/abc 처럼 형식이 틀린 id는 API가 400으로 거절한다. 던지면 페이지가 잡아도
  // 렌더 오류로 보고됐다(YONYOUNG-WEB-C).
  it.each([400, 404])(
    "API가 %i로 답하면 던지지 않고 null을 짧게 캐시한다",
    async (status) => {
      honoRequest.mockRejectedValueOnce(
        new HonoApiError({ status, code: "BAD_REQUEST", message: "rejected" }),
      );

      await expect(read("abc")).resolves.toBeNull();
      expect(cacheLife).toHaveBeenCalledWith("minutes");
      expect(cacheLife).not.toHaveBeenCalledWith("days");
    },
  );

  it("API 장애는 그대로 던져 캐시하지 않는다", async () => {
    const outage = new HonoApiError({ status: 503, message: "unavailable" });
    honoRequest.mockRejectedValueOnce(outage);

    await expect(read("abc")).rejects.toBe(outage);
  });

  it("id를 API 경로 한 칸으로만 넣는다", async () => {
    honoRequest.mockResolvedValueOnce({ id: "x" });

    await read("../admin?x=1");
    const { path } = honoRequest.mock.calls[0]![0] as { path: string };
    expect(path).toContain("..%2Fadmin%3Fx%3D1");
    expect(path).not.toContain("../admin");
  });

  it("찾으면 길게 캐시한다", async () => {
    honoRequest.mockResolvedValueOnce({ id: "found" });

    await expect(read("found")).resolves.toEqual({ id: "found" });
    expect(cacheLife).toHaveBeenCalledWith("days");
  });
});
