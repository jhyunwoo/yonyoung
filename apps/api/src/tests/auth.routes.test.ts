import { describe, expect, it, vi, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { registerAuthRoutes } from "../features/auth/auth.routes";
import type HonoAppType from "../types/honoAppType";

vi.mock("../lib/auth", () => ({
  createAuth: vi.fn(),
}));

import { createAuth } from "../lib/auth";

describe("auth routes", () => {
  const mockCreateAuth = vi.mocked(createAuth);
  const bindings = { db: {} as D1Database } as HonoAppType["Bindings"];

  beforeEach(() => {
    mockCreateAuth.mockReset();
  });

  it("/api/auth/* GET 요청은 Better Auth handler에 위임한다", async () => {
    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    mockCreateAuth.mockReturnValue({ handler } as never);

    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    const response = await app.request("/api/auth/get-session", {
      method: "GET",
    }, bindings);

    expect(response.status).toBe(200);
    expect(mockCreateAuth).toHaveBeenCalledTimes(1);
    expect(mockCreateAuth).toHaveBeenCalledWith(bindings.db, {
      ...bindings,
      BETTER_AUTH_URL: "http://localhost",
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("/api/auth/* POST 요청은 Better Auth handler에 위임한다", async () => {
    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    mockCreateAuth.mockReturnValue({ handler } as never);

    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    const response = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "tester@example.com", password: "secret" }),
    }, bindings);

    expect(response.status).toBe(200);
    expect(mockCreateAuth).toHaveBeenCalledTimes(1);
    expect(mockCreateAuth).toHaveBeenCalledWith(bindings.db, {
      ...bindings,
      BETTER_AUTH_URL: "http://localhost",
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  describe("OAuth 클라이언트 등록 횟수 제한", () => {
    const register = (
      app: OpenAPIHono<HonoAppType>,
      env: HonoAppType["Bindings"],
    ) =>
      app.request(
        "/api/auth/oauth2/register",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "cf-connecting-ip": "203.0.113.7",
          },
          body: JSON.stringify({ redirect_uris: ["https://claude.ai/cb"] }),
        },
        env,
      );

    it("한도를 넘으면 429로 막고 Better Auth를 부르지 않는다", async () => {
      const handler = vi.fn(async () => new Response("ok", { status: 200 }));
      mockCreateAuth.mockReturnValue({ handler } as never);
      const limit = vi.fn(async () => ({ success: false }));
      const app = new OpenAPIHono<HonoAppType>();
      registerAuthRoutes(app);

      const response = await register(app, {
        ...bindings,
        OAUTH_REGISTER_RATE_LIMITER: { limit } as unknown as RateLimit,
      });

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("60");
      expect(limit).toHaveBeenCalledWith({
        key: "oauth-register:203.0.113.7",
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it("한도 안이면 Better Auth에 위임한다", async () => {
      const handler = vi.fn(async () => new Response("ok", { status: 200 }));
      mockCreateAuth.mockReturnValue({ handler } as never);
      const app = new OpenAPIHono<HonoAppType>();
      registerAuthRoutes(app);

      const response = await register(app, {
        ...bindings,
        OAUTH_REGISTER_RATE_LIMITER: {
          limit: async () => ({ success: true }),
        } as unknown as RateLimit,
      });

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("바인딩이 없거나 한도 조회가 실패하면 등록을 막지 않는다", async () => {
      const handler = vi.fn(async () => new Response("ok", { status: 200 }));
      mockCreateAuth.mockReturnValue({ handler } as never);
      const app = new OpenAPIHono<HonoAppType>();
      registerAuthRoutes(app);

      expect((await register(app, bindings)).status).toBe(200);
      expect(
        (
          await register(app, {
            ...bindings,
            OAUTH_REGISTER_RATE_LIMITER: {
              limit: async () => {
                throw new Error("limiter unavailable");
              },
            } as unknown as RateLimit,
          })
        ).status,
      ).toBe(200);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe("로그인 시작 횟수 제한", () => {
    const signIn = (
      app: OpenAPIHono<HonoAppType>,
      env: HonoAppType["Bindings"],
    ) =>
      app.request(
        "/api/auth/sign-in/social",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "cf-connecting-ip": "203.0.113.7",
          },
          body: JSON.stringify({ provider: "google" }),
        },
        env,
      );

    it("한도를 넘으면 429로 막고 Better Auth를 부르지 않는다", async () => {
      const handler = vi.fn(async () => new Response("ok", { status: 200 }));
      mockCreateAuth.mockReturnValue({ handler } as never);
      const limit = vi.fn(async () => ({ success: false }));
      const app = new OpenAPIHono<HonoAppType>();
      registerAuthRoutes(app);

      const response = await signIn(app, {
        ...bindings,
        PROXY_CLIENT_IP_SECRET: "shared-secret-for-client-ip",
        AUTH_SIGN_IN_RATE_LIMITER: { limit } as unknown as RateLimit,
      });

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("60");
      expect(limit).toHaveBeenCalledWith({ key: "auth-sign-in:203.0.113.7" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("한도 안이거나 바인딩이 없거나 한도 조회가 실패하면 로그인을 막지 않는다", async () => {
      const handler = vi.fn(async () => new Response("ok", { status: 200 }));
      mockCreateAuth.mockReturnValue({ handler } as never);
      const app = new OpenAPIHono<HonoAppType>();
      registerAuthRoutes(app);

      expect((await signIn(app, bindings)).status).toBe(200);
      for (const limit of [
        async () => ({ success: true }),
        async () => {
          throw new Error("limiter unavailable");
        },
      ]) {
        const response = await signIn(app, {
          ...bindings,
          PROXY_CLIENT_IP_SECRET: "shared-secret-for-client-ip",
          AUTH_SIGN_IN_RATE_LIMITER: { limit } as unknown as RateLimit,
        });
        expect(response.status).toBe(200);
      }
      expect(handler).toHaveBeenCalledTimes(3);
    });

    // 웹 BFF가 방문자 IP를 넘기지 못하면 웹을 거친 모든 로그인이 웹 서버 IP 하나로 보인다.
    // 그 상태에서 한도를 걸면 누구든 분당 30번 요청으로 전원의 로그인을 막을 수 있다.
    it("방문자를 구분할 수 없는 구성에서는 한도를 적용하지 않는다", async () => {
      const handler = vi.fn(async () => new Response("ok", { status: 200 }));
      mockCreateAuth.mockReturnValue({ handler } as never);
      const limit = vi.fn(async () => ({ success: false }));
      const app = new OpenAPIHono<HonoAppType>();
      registerAuthRoutes(app);

      const response = await signIn(app, {
        ...bindings,
        AUTH_SIGN_IN_RATE_LIMITER: { limit } as unknown as RateLimit,
      });

      expect(response.status).toBe(200);
      expect(limit).not.toHaveBeenCalled();
    });
  });

  // 런타임은 요청 URL을 정규화하지 않고 넘긴다. Hono는 그 경로 그대로 라우팅하지만
  // Better Auth는 `..`를 접은 경로로 라우팅하므로, 정규화되지 않은 경로는 경로별 보호를 건너뛴다.
  it("정규화되지 않은 경로는 Better Auth에 넘기지 않는다", async () => {
    const handler = vi.fn(async () => new Response("ok", { status: 200 }));
    mockCreateAuth.mockReturnValue({ handler } as never);
    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    for (const path of [
      "/api/auth/x/../sign-in/social",
      "/api/auth/x/%2e%2e/sign-in/social",
      "/api/auth/./oauth2/register",
      "/api/auth/oauth2/x/../register",
      "/api/auth/x/../open-api/generate-schema",
    ]) {
      // Request 생성자는 경로를 정규화하므로, 런타임이 넘기는 원본 URL을 그대로 흉내 낸다.
      const rawRequest = {
        url: `https://api.example.test${path}`,
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
      } as unknown as Request;

      const response = await app.fetch(rawRequest, bindings);
      expect(response.status, path).toBe(404);
    }
    expect(handler).not.toHaveBeenCalled();
  });

  it("문서가 꺼져 있으면 인증 OpenAPI 스키마를 내보내지 않는다", async () => {
    const handler = vi.fn(async () => new Response("{}", { status: 200 }));
    mockCreateAuth.mockReturnValue({ handler } as never);

    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    const hidden = await app.request(
      "/api/auth/open-api/generate-schema",
      { method: "GET" },
      { ...bindings, DOCS_ENABLED: "false" },
    );
    expect(hidden.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();

    const shown = await app.request(
      "/api/auth/open-api/generate-schema",
      { method: "GET" },
      { ...bindings, DOCS_ENABLED: "true" },
    );
    expect(shown.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("웹 프록시가 넘긴 sec-fetch-mode를 복원해 Better Auth에 넘긴다", async () => {
    const handler = vi.fn(async (_request: Request) => new Response(null, { status: 302 }));
    mockCreateAuth.mockReturnValue({ handler } as never);

    const app = new OpenAPIHono<HonoAppType>();
    registerAuthRoutes(app);

    await app.request("/api/auth/oauth2/authorize", {
      method: "GET",
      headers: {
        // Node fetch로 보낸 프록시 요청은 sec-fetch-mode가 항상 cors다.
        "sec-fetch-mode": "cors",
        "x-forwarded-sec-fetch-mode": "navigate",
      },
    }, bindings);

    const forwarded = handler.mock.calls[0]![0];
    expect(forwarded.headers.get("sec-fetch-mode")).toBe("navigate");
    expect(forwarded.headers.has("x-forwarded-sec-fetch-mode")).toBe(false);
  });
});
