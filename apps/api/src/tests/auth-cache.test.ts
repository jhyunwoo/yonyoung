import { describe, expect, it } from "vitest";
import { createAuth } from "../lib/auth";

const AUTH_ENV = {
  BETTER_AUTH_URL: "https://web.example.test",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://web.example.test",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  MCP_RESOURCE_URL: "https://api.example.test/mcp",
  MCP_AUTH_ISSUER: "https://web.example.test/api/auth",
};

const createStatement = () => {
  const statement = {
    bind: () => statement,
    all: async () => ({ results: [], success: true, meta: {} }),
    raw: async () => [],
    first: async () => null,
    run: async () => ({ results: [], success: true, meta: { changes: 1 } }),
  };
  return statement;
};

/** 첫 쿼리(oauth_resource 시드 조회)만 일시 오류로 실패하는 D1. */
const createFlakyDatabase = () => {
  let failNext = true;
  return {
    prepare: () => {
      if (failNext) {
        failNext = false;
        throw new Error("D1_ERROR: network connection lost");
      }
      return createStatement();
    },
    batch: async () => [],
  } as unknown as D1Database;
};

describe("createAuth 캐시", () => {
  it("시작 시 시드 조회가 일시 오류로 실패해도 인스턴스는 살아 있고 캐시에서 재사용된다", async () => {
    const database = createFlakyDatabase();

    // oauth-provider 1.7.11부터 시작 시드 실패는 reject하지 않고 첫 리소스 접근 때 다시 시도한다.
    const auth = createAuth(database, AUTH_ENV);
    await expect(auth.$context).resolves.toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createAuth(database, AUTH_ENV)).toBe(auth);
  });
});
