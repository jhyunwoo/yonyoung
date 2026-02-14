import { Context } from "hono";

/**
 * API 에러 코드 타입
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

/**
 * Date 객체를 timestamp(ms) 숫자로 직렬화한다.
 * 클라이언트에서 포맷팅을 담당하도록 응답을 일관되게 맞춘다.
 */
const normalizeValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value;
};

export const ok = <T>(c: Context, data: T, status = 200) => {
  return c.json({ data: normalizeValue(data) }, status as 200 | 201);
};

export const noContent = (c: Context) => {
  return c.body(null, 204);
};

export const errorResponse = (
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: ApiErrorCode,
  message: string,
) => {
  return c.json(
    {
      error: {
        code,
        message,
      },
    },
    status,
  );
};

export const badRequest = (c: Context, message: string) =>
  errorResponse(c, 400, "BAD_REQUEST", message);

export const unauthorized = (c: Context, message = "로그인이 필요합니다.") =>
  errorResponse(c, 401, "UNAUTHORIZED", message);

export const forbidden = (c: Context, message = "권한이 없습니다.") =>
  errorResponse(c, 403, "FORBIDDEN", message);

export const notFound = (c: Context, message = "대상을 찾을 수 없습니다.") =>
  errorResponse(c, 404, "NOT_FOUND", message);

export const conflict = (c: Context, message: string) =>
  errorResponse(c, 409, "CONFLICT", message);

export const internalError = (
  c: Context,
  message = "서버 내부 오류가 발생했습니다.",
) => errorResponse(c, 500, "INTERNAL_ERROR", message);
