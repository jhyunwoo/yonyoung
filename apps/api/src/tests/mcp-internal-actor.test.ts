import { describe, expect, it, vi } from "vitest";
import {
  MCP_ACTOR,
  readInternalActor,
  withInternalActor,
} from "../features/mcp/internal-actor";
import {
  IDs,
  createActor,
  createDataServiceMock,
  createGeneration,
  createTestApp,
} from "./test-helpers";

describe("내부 Actor 주입", () => {
  it("env에 실린 Actor로 기존 라우트 권한을 판정한다", async () => {
    const listGenerations = vi.fn(async () => [createGeneration()]);
    const app = createTestApp({
      actor: null,
      dataService: createDataServiceMock({ listGenerations }),
    });

    const response = await app.fetch(
      new Request("http://localhost/api/generations"),
      withInternalActor(undefined, createActor("regular_member")),
    );

    expect(response.status).toBe(200);
    expect(listGenerations).toHaveBeenCalledTimes(1);
  });

  it("권한이 없는 내부 Actor는 기존 라우트에서 403을 받는다", async () => {
    const app = createTestApp({ actor: null });

    const response = await app.fetch(
      new Request(`http://localhost/api/generations/${IDs.generation}`, {
        method: "DELETE",
      }),
      withInternalActor(undefined, createActor("vice_president")),
    );

    expect(response.status).toBe(403);
  });

  it("env에 Actor가 없으면 원래 resolveActor를 쓴다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations");
    expect(response.status).toBe(401);
  });

  it("외부 요청은 헤더로 Actor를 주입할 수 없다", async () => {
    const app = createTestApp({ actor: null });
    const response = await app.request("/api/generations", {
      headers: { "x-mcp-actor": JSON.stringify(createActor("president")) },
    });
    expect(response.status).toBe(401);
  });

  it("Symbol 키는 문자열 키로 흉내 낼 수 없다", () => {
    expect(
      readInternalActor({ "yonyoung.mcp.actor": createActor("president") }),
    ).toBeUndefined();
    expect(readInternalActor({ [MCP_ACTOR]: createActor("president") })?.role).toBe(
      "president",
    );
    expect(readInternalActor(undefined)).toBeUndefined();
  });
});
