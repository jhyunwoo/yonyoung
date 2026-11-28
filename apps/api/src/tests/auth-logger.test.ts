import { DrizzleQueryError } from "drizzle-orm/errors";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logBetterAuthMessage } from "../lib/auth/auth-logger";

afterEach(() => vi.restoreAllMocks());

describe("logBetterAuthMessage", () => {
  // Better Auth 기본 로거는 오류 객체를 console에 그대로 찍는다. 세션·계정 쿼리가 실패하면
  // 바인딩 값(세션 토큰, 이메일, Google 토큰)이 함께 나간다.
  it("실패한 인증 쿼리의 바인딩 값을 로그에 남기지 않는다", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      lines.push(line);
    });

    logBetterAuthMessage(
      "error",
      "Error",
      new DrizzleQueryError(
        'insert into "session" ("token", "user_id") values (?, ?)',
        ["session-token-value", "member@example.com"],
        new Error("D1_ERROR: Network connection lost."),
      ),
      { unexpected: "object" },
    );

    const entry = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(entry).toMatchObject({ level: "error", event: "auth.log", message: "Error" });
    expect(lines.join("")).toContain('insert into \\"session\\"');
    expect(lines.join("")).not.toContain("session-token-value");
    expect(lines.join("")).not.toContain("member@example.com");
  });
});
