import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/http/request-context", () => ({
  readServerForwardedRequestContext: vi.fn(async () => ({
    host: "yonyoung.yonsei.ac.kr",
    protocol: "https" as const,
    origin: "https://yonyoung.yonsei.ac.kr",
  })),
}));

import {
  SessionUnavailableError,
  fetchSessionFromApi,
} from "@/features/auth/server/auth-server";

const sessionPayload = {
  session: {
    id: "s1",
    userId: "u1",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  },
  user: { id: "u1", email: "admin@example.com", name: "관리자", role: "president" },
};

describe("fetchSessionFromApi", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  beforeEach(() => {
    process.env.API_BASE_URL = "https://api.example.com";
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalApiBaseUrl;
    vi.unstubAllGlobals();
  });

  it("유효한 세션을 파싱한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(sessionPayload)),
    );

    await expect(fetchSessionFromApi("session=1")).resolves.toMatchObject({
      user: { id: "u1", role: "president" },
    });
  });

  it("401은 로그인하지 않은 상태(null)로 본다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(fetchSessionFromApi("session=1")).resolves.toBeNull();
  });

  it("세션이 없다는 null 본문도 null이다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(null)),
    );

    await expect(fetchSessionFromApi(null)).resolves.toBeNull();
  });

  it.each([500, 503, 408, 429])(
    "%i 응답은 로그아웃이 아니라 일시 장애로 알린다",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status })),
      );

      await expect(fetchSessionFromApi("session=1")).rejects.toBeInstanceOf(
        SessionUnavailableError,
      );
    },
  );

  it("연결 실패도 일시 장애로 알린다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(fetchSessionFromApi("session=1")).rejects.toBeInstanceOf(
      SessionUnavailableError,
    );
  });
});
