import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mapErrorToAppError } from "../../src/shared/errors/mapError";

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
