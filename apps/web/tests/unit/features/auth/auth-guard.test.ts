import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const readCookieHeaderMock = vi.hoisted(() => vi.fn());
const getApiBaseUrlMock = vi.hoisted(() => vi.fn());
const readServerForwardedRequestContextMock = vi.hoisted(() =>
  vi.fn(async () => ({
    host: "yonyoung.yonsei.ac.kr",
    protocol: "https" as const,
    origin: "https://yonyoung.yonsei.ac.kr",
  })),
);

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);
const forbiddenMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_FORBIDDEN");
  }),
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  forbidden: forbiddenMock,
}));

vi.mock("@/features/auth/server/auth-server", () => ({
  fetchSessionFromApi: vi.fn(),
}));

vi.mock("@/shared/http/http", () => {
  const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (typeof value !== "object" || value === null) {
      return null;
    }
    return value as Record<string, unknown>;
  };

  return {
    asRecord,
    createTimeoutController: () => ({
      controller: new AbortController(),
      timeoutId: setTimeout(() => undefined, 0),
    }),
    clearTimeoutController: (timeoutId: ReturnType<typeof setTimeout>) => {
      clearTimeout(timeoutId);
    },
    applyForwardedRequestContextHeaders: (
      headers: Headers,
      context: { host: string | null; protocol: "http" | "https"; origin: string | null },
    ) => {
      if (context.host) {
        headers.set("x-forwarded-host", context.host);
      }
      headers.set("x-forwarded-proto", context.protocol);
      if (context.origin) {
        headers.set("origin", context.origin);
      }
      return headers;
    },
    unwrapDataEnvelope: <T>(payload: unknown): T | null => {
      const record = asRecord(payload);
      if (record && "data" in record) {
        return (record as { data: T | null }).data ?? null;
      }
      return payload as T;
    },
  };
});

vi.mock("@/server/http/cookie-header", () => ({
  readCookieHeader: readCookieHeaderMock,
}));

vi.mock("@/server/env", () => ({
  getApiBaseUrl: getApiBaseUrlMock,
}));

vi.mock("@/server/http/request-context", () => ({
  readServerForwardedRequestContext: readServerForwardedRequestContextMock,
}));

import type { AuthSession } from "@/features/auth/model/auth-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { fetchSessionFromApi } from "@/features/auth/server/auth-server";

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

const createSession = (): AuthSession => ({
  session: {
    id: "session-id",
    userId: "user-id",
    expiresAt: 0,
  },
  user: {
    id: "non-uuid-user-id",
    email: "member@example.com",
    name: "연영 회원",
    role: "regular_member",
  },
});

describe("features/auth/server/auth-guard", () => {
  beforeEach(() => {
    readCookieHeaderMock.mockReset();
    readCookieHeaderMock.mockResolvedValue("better-auth.session_token=session-token");
    getApiBaseUrlMock.mockReset();
    getApiBaseUrlMock.mockReturnValue("https://api.example.com");
    readServerForwardedRequestContextMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to users list by email when user-id lookup fails", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: "NOT_FOUND",
              message: "Not Found",
            },
          },
          404,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: "BAD_REQUEST",
              message: "id 형식이 올바르지 않습니다.",
            },
          },
          400,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          data: [
            {
              id: "user-id",
              email: "member@example.com",
              generationId: "gen-59",
              generationIds: ["gen-59", "gen-58"],
            },
          ],
        }),
      );

    const profile = await serverAuthGuard.getCurrentUserProfile(createSession());

    expect(profile).toEqual({
      id: "user-id",
      email: "member@example.com",
      generationId: "gen-59",
      generationIds: ["gen-59", "gen-58"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/api/users/me");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.example.com/api/users/non-uuid-user-id",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.example.com/api/users");
    for (const call of fetchMock.mock.calls) {
      expect((call[1] as RequestInit | undefined)?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("prefers /api/users/me when available", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createJsonResponse({
        data: {
          id: "user-id",
          email: "member@example.com",
          generationId: "gen-59",
          generationIds: ["gen-59"],
        },
      }),
    );

    const profile = await serverAuthGuard.getCurrentUserProfile(createSession());

    expect(profile).toEqual({
      id: "user-id",
      email: "member@example.com",
      generationId: "gen-59",
      generationIds: ["gen-59"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.com/api/users/me");
    const requestHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)
      ?.headers as Headers;
    expect(requestHeaders.get("x-forwarded-host")).toBe("yonyoung.yonsei.ac.kr");
    expect(requestHeaders.get("x-forwarded-proto")).toBe("https");
    expect(requestHeaders.get("origin")).toBe("https://yonyoung.yonsei.ac.kr");
  });

  describe("requireAdminPageAccess", () => {
    const completeProfile = {
      id: "user-id",
      email: "member@example.com",
      familyName: "김",
      givenName: "연영",
      college: "문과대학",
      department: "국어국문학과",
      studentNumber: "2020123456",
      phoneNumber: "010-1234-5678",
    };

    const mockSessionAndProfile = (
      role: string,
      profile: Record<string, unknown>,
    ): AuthSession => {
      const base = createSession();
      const session: AuthSession = { ...base, user: { ...base.user, role } };
      vi.mocked(fetchSessionFromApi).mockResolvedValue(session);
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        createJsonResponse({ data: profile }),
      );
      return session;
    };

    beforeEach(() => {
      vi.mocked(fetchSessionFromApi).mockReset();
      redirectMock.mockClear();
      forbiddenMock.mockClear();
    });

    it("세션이 없으면 로그인으로 보낸다", async () => {
      vi.mocked(fetchSessionFromApi).mockResolvedValue(null);
      vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
        createJsonResponse({ error: { code: "UNAUTHORIZED" } }, 401),
      );

      await expect(serverAuthGuard.requireAdminPageAccess()).rejects.toThrow(
        "NEXT_REDIRECT:/auth/sign-in",
      );
    });

    it("승인 대기(unverified) 사용자는 승인 대기 화면으로 보낸다", async () => {
      mockSessionAndProfile("unverified", completeProfile);

      await expect(serverAuthGuard.requireAdminPageAccess()).rejects.toThrow(
        "NEXT_REDIRECT:/auth/pending-approval",
      );
      expect(forbiddenMock).not.toHaveBeenCalled();
    });

    it("프로필을 채우지 않은 승인 대기 사용자는 프로필 작성으로 보낸다", async () => {
      mockSessionAndProfile("unverified", { ...completeProfile, phoneNumber: null });

      await expect(serverAuthGuard.requireAdminPageAccess()).rejects.toThrow(
        "NEXT_REDIRECT:/auth/profile",
      );
      expect(forbiddenMock).not.toHaveBeenCalled();
    });

    it("승인된 역할이어도 프로필이 비어 있으면 프로필 작성으로 보낸다", async () => {
      mockSessionAndProfile("regular_member", { ...completeProfile, college: null });

      await expect(serverAuthGuard.requireAdminPageAccess()).rejects.toThrow(
        "NEXT_REDIRECT:/auth/profile",
      );
    });

    it("승인된 역할이고 프로필을 채웠으면 세션을 돌려준다", async () => {
      const session = mockSessionAndProfile("regular_member", completeProfile);

      await expect(serverAuthGuard.requireAdminPageAccess()).resolves.toBe(session);
      expect(redirectMock).not.toHaveBeenCalled();
      expect(forbiddenMock).not.toHaveBeenCalled();
    });
  });
});
