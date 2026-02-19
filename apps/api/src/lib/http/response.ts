import { Context } from "hono";
import type { ApiErrorCode } from "@repo/shared-api-contracts";

/**
 * Date 객체를 timestamp(ms) 숫자로 직렬화한다.
 * 클라이언트에서 포맷팅을 담당하도록 응답을 일관되게 맞춘다.
 */
const normalizeValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (Array.isArray(value)) {
    return value.map(/** value.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param entry 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(/** Object.entries(value).map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param [key, entry] 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ ([key, entry]) => [key, normalizeValue(entry)]),
    );
  }

  return value;
};

/**
 * ok의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param data 처리 대상 데이터입니다.
 * @param status 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const ok = <T>(c: Context, data: T, status = 200) => {
  return c.json({ data: normalizeValue(data) }, status as 200 | 201);
};

/**
 * noContent의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const noContent = (c: Context) => {
  return c.body(null, 204);
};

/**
 * errorResponse의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param status 함수 로직에서 사용하는 입력값입니다.
 * @param code 함수 로직에서 사용하는 입력값입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const errorResponse = (
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

/**
 * badRequest의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const badRequest = (c: Context, message: string) =>
  errorResponse(c, 400, "BAD_REQUEST", message);

/**
 * unauthorized의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const unauthorized = (c: Context, message = "로그인이 필요합니다.") =>
  errorResponse(c, 401, "UNAUTHORIZED", message);

/**
 * forbidden의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const forbidden = (c: Context, message = "권한이 없습니다.") =>
  errorResponse(c, 403, "FORBIDDEN", message);

/**
 * notFound의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const notFound = (c: Context, message = "대상을 찾을 수 없습니다.") =>
  errorResponse(c, 404, "NOT_FOUND", message);

/**
 * conflict의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const conflict = (c: Context, message: string) =>
  errorResponse(c, 409, "CONFLICT", message);

/**
 * internalError의 핵심 비즈니스 로직을 수행합니다.
 * @param c 요청/실행 컨텍스트 객체입니다.
 * @param message 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const internalError = (
  c: Context,
  message = "서버 내부 오류가 발생했습니다.",
) => errorResponse(c, 500, "INTERNAL_ERROR", message);
