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
