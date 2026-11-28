import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { mapErrorToAppError } from "../../src/shared/errors/mapError";
import { logger } from "../../src/shared/logging/logger";

describe("mapErrorToAppError", () => {
  it("maps Zod errors to validation app errors", () => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse({ id: "x" });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const mapped = mapErrorToAppError(parsed.error);
    expect(mapped.httpStatus).toBe(400);
    expect(mapped.code).toBe("VALIDATION_ERROR");
  });

  it("maps sqlite constraint messages to conflict", () => {
    const mapped = mapErrorToAppError(
      new Error("SQLITE_CONSTRAINT: unique constraint failed"),
    );

    expect(mapped.httpStatus).toBe(409);
    expect(mapped.code).toBe("DB_ERROR");
  });

  // drizzle은 batch가 아닌 쿼리 실패를 DrizzleQueryError로 감싼다. 실제 D1 오류는 cause에만 있다.
  it("drizzle이 감싼 제약 조건 위반도 cause를 보고 409로 분류한다", () => {
    const mapped = mapErrorToAppError(
      new DrizzleQueryError(
        'insert into "generations" ("id", "name") values (?, ?)',
        ["id-1", "60기"],
        new Error("D1_ERROR: UNIQUE constraint failed: generations.name"),
      ),
    );

    expect(mapped.httpStatus).toBe(409);
    expect(mapped.code).toBe("DB_ERROR");
  });

  it("drizzle이 감싼 오류는 바인딩 값이 아니라 cause로만 분류한다", () => {
    const mapped = mapErrorToAppError(
      new DrizzleQueryError(
        'update "user" set "department" = ? where "id" = ?',
        ["unique constraint failed", "u-1"],
        new Error("Network connection lost."),
      ),
    );

    expect(mapped.httpStatus).toBe(500);
  });

  it("실패한 쿼리의 바인딩 값은 로그에 남기지 않는다", () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (line: string) => {
      lines.push(line);
    };
    try {
      logger.error({
        event: "request.failed",
        message: new DrizzleQueryError(
          'update "user" set "phone_number" = ? where "id" = ?',
          ["010-1234-5678", "u-1"],
          new Error("Network connection lost."),
        ).message,
      });
    } finally {
      console.log = original;
    }

    const output = lines.join("");
    expect(output).toContain("Failed query: update");
    expect(output).not.toContain("010-1234-5678");
  });

  it("앞에 다른 글자가 붙은 쿼리 실패 메시지에서도 바인딩 값을 지운다", () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (line: string) => {
      lines.push(line);
    };
    try {
      logger.error({
        event: "auth.log",
        message: `Error: ${
          new DrizzleQueryError('insert into "session" ("token") values (?)', [
            "session-token-value",
          ]).message
        }`,
      });
    } finally {
      console.log = original;
    }

    expect(lines.join("")).not.toContain("session-token-value");
  });

  it("maps r2 missing key messages to not found", () => {
    const mapped = mapErrorToAppError(
      new Error("NoSuchKey: The specified key does not exist"),
    );

    expect(mapped.httpStatus).toBe(404);
    expect(mapped.code).toBe("R2_ERROR");
  });

  it("maps unknown errors to internal", () => {
    const mapped = mapErrorToAppError(new Error("unexpected"));

    expect(mapped.httpStatus).toBe(500);
    expect(mapped.code).toBe("INTERNAL_ERROR");
  });

  it("메시지에 auth/session이 들어갔다는 이유만으로 401로 바꾸지 않는다", () => {
    for (const message of [
      "BETTER_AUTH_SECRET is not set",
      "Cannot read properties of undefined (reading 'session')",
    ]) {
      const mapped = mapErrorToAppError(new Error(message));
      expect(mapped.httpStatus).toBe(500);
      expect(mapped.code).toBe("INTERNAL_ERROR");
    }
  });

  it("상태 코드를 가진 Better Auth APIError는 그 상태를 따른다", () => {
    const error = Object.assign(new Error("Unauthorized"), {
      name: "APIError",
      statusCode: 401,
    });

    const mapped = mapErrorToAppError(error);
    expect(mapped.httpStatus).toBe(401);
    expect(mapped.code).toBe("AUTH_ERROR");
  });

  it("본문 JSON 파싱 실패(SyntaxError)만 400으로 본다", () => {
    expect(
      mapErrorToAppError(
        new SyntaxError("Unexpected token } in JSON at position 1"),
      ).httpStatus,
    ).toBe(400);
    expect(
      mapErrorToAppError(new Error("failed to serialize JSON response"))
        .httpStatus,
    ).toBe(500);
  });

  it("외래 키 위반은 409가 아니라 400으로 알린다", () => {
    const mapped = mapErrorToAppError(
      new Error("D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT"),
    );
    expect(mapped.httpStatus).toBe(400);
    expect(mapped.code).toBe("BAD_REQUEST");
  });
});
