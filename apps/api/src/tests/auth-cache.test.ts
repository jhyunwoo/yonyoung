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
  it("초기화에 실패한 인스턴스는 캐시에서 빠지고 다음 호출이 새로 만든다", async () => {
    const database = createFlakyDatabase();

    const failed = createAuth(database, AUTH_ENV);
    await expect(failed.$context).rejects.toThrow("network connection lost");
    // 캐시 제거는 $context의 catch 콜백에서 일어난다.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const retried = createAuth(database, AUTH_ENV);
    expect(retried).not.toBe(failed);
    await expect(retried.$context).resolves.toBeDefined();
    expect(createAuth(database, AUTH_ENV)).toBe(retried);
  });
});
