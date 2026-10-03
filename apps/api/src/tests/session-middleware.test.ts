import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "./test-helpers";

describe("session middleware", () => {
  it("세션 해석이 실패하면 기록을 남기고 인증 실패(401)로 닫는다", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const resolveActor = vi.fn(async () => {
      throw new Error("BETTER_AUTH_SECRET is not set");
    });
    const app = createTestApp({ actor: null, resolveActor });

    const response = await app.request("/api/users/me", {}, { db: {} as D1Database });

    expect(response.status).toBe(401);
    expect(resolveActor).toHaveBeenCalled();
    expect(
      log.mock.calls.some(([line]) => String(line).includes("session.resolve_failed")),
    ).toBe(true);
    log.mockRestore();
  });
});
