import { describe, expect, it } from "vitest";
import { createTestApp, expectErrorCode } from "./test-helpers";

describe("docs and system routes", () => {
  it("/api/openapi.json 생성 중 예외가 발생하면 500을 반환한다", async () => {
    const app = createTestApp({
      actor: null,
      getAuthOpenApiSchema: async () => {
        throw new Error("auth openapi unavailable");
      },
    });

    const response = await app.request("/api/openapi.json");
    expect(response.status).toBe(500);
    await expectErrorCode(response, "INTERNAL_ERROR");
  });

  it("/message는 헬스 체크 문자열을 반환한다", async () => {
    const app = createTestApp({ actor: null });

    const response = await app.request("/message");
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe("Hello Hono!");
  });
});
