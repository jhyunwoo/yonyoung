import { describe, expect, it, vi } from "vitest";
import { readInternalActor } from "../features/mcp/internal-actor";
import {
  createInternalApiClient,
  fillPath,
  type InternalDispatch,
} from "../features/mcp/internal-api";
import { toToolResult } from "../features/mcp/tool-result";
import { createActor } from "./test-helpers";

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const createClient = (dispatch: InternalDispatch) =>
  createInternalApiClient({
    dispatch,
    env: { db: "binding" },
    actor: createActor("manager"),
    origin: "https://api.example.test",
    requestId: "req-1",
  });

describe("내부 API 클라이언트", () => {
  it("쿼리를 붙여 GET을 보내고 data를 꺼낸다", async () => {
    const dispatch = vi.fn<InternalDispatch>(async () =>
      jsonResponse(200, { data: [{ id: "a" }] }),
    );
    const result = await createClient(dispatch).call({
      method: "GET",
      path: "/api/activities",
      query: { generationId: "g-1", empty: undefined },
    });

    expect(result).toEqual({ ok: true, status: 200, data: [{ id: "a" }] });
    const [request, env] = dispatch.mock.calls[0]!;
    expect(request.url).toBe("https://api.example.test/api/activities?generationId=g-1");
    expect(request.headers.get("x-request-id")).toBe("req-1");
    expect(readInternalActor(env)?.role).toBe("manager");
    expect((env as { db: string }).db).toBe("binding");
  });

  it("본문을 JSON으로 보낸다", async () => {
    const dispatch = vi.fn<InternalDispatch>(async () => jsonResponse(201, { data: { id: "n" } }));
    await createClient(dispatch).call({
      method: "POST",
      path: "/api/linktree",
      body: { name: "공식 링크" },
    });

    const [request] = dispatch.mock.calls[0]!;
    expect(request.method).toBe("POST");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(await request.json()).toEqual({ name: "공식 링크" });
  });

  it("204는 data null로 돌려준다", async () => {
    const result = await createClient(async () => new Response(null, { status: 204 })).call({
      method: "DELETE",
      path: "/api/linktree/x",
    });
    expect(result).toEqual({ ok: true, status: 204, data: null });
  });

  it("오류 봉투를 풀어 돌려준다", async () => {
    const result = await createClient(async () =>
      jsonResponse(403, { error: { code: "FORBIDDEN", message: "권한이 없습니다.", requestId: "r-9" } }),
    ).call({ method: "DELETE", path: "/api/generations/x" });

    expect(result).toEqual({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "권한이 없습니다.",
      requestId: "r-9",
    });
  });

  it("JSON이 아닌 오류 응답에도 기본 문구를 준다", async () => {
    const result = await createClient(async () => new Response("boom", { status: 502 })).call({
      method: "GET",
      path: "/api/activities",
    });
    expect(result).toMatchObject({ ok: false, status: 502, code: "UNKNOWN_ERROR" });
  });
});

describe("fillPath", () => {
  it("경로 파라미터를 인코딩해 채운다", () => {
    expect(fillPath("/api/users/{id}", { id: "a/b c" })).toBe("/api/users/a%2Fb%20c");
  });

  it("빠진 파라미터는 예외를 던진다", () => {
    expect(() => fillPath("/api/users/{id}", {})).toThrow("id");
  });

  it("점 경로 조각은 예외를 던진다", () => {
    expect(() => fillPath("/api/users/{id}", { id: ".." })).toThrow("id");
    expect(() => fillPath("/api/users/{id}/role", { id: "." })).toThrow("id");
    expect(fillPath("/api/users/{id}", { id: "..." })).toBe("/api/users/...");
  });
});

describe("toToolResult", () => {
  it("성공이면 요약과 JSON을 함께 준다", () => {
    const result = toToolResult(
      { ok: true, status: 200, data: { id: "a" } },
      { summary: "활동입니다.", role: "manager" },
    );
    expect(result.isError).toBeUndefined();
    expect(result.content[0]).toMatchObject({ type: "text" });
    expect((result.content[0] as { text: string }).text).toContain("활동입니다.");
    expect(result.structuredContent).toEqual({ data: { id: "a" } });
  });

  it("403이면 현재 역할 이름을 알려준다", () => {
    const result = toToolResult(
      { ok: false, status: 403, code: "FORBIDDEN", message: "권한이 없습니다.", requestId: "r-1" },
      { summary: "", role: "manager" },
    );
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("현재 역할(부장)");
    expect(text).toContain("사유: 권한이 없습니다.");
    expect(text).toContain("요청 ID: r-1");
  });
});
