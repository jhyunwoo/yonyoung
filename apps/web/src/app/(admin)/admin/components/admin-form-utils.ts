import { AdminApiError } from "../../../../lib/admin-api/types";

/**
 * formatTimestamp의 핵심 비즈니스 로직을 수행합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const formatTimestamp = (value: number): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ko-KR");
};

/**
 * toDateInputValue의 핵심 비즈니스 로직을 수행합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const toDateInputValue = (value: number | null | undefined): string => {
  if (typeof value !== "number") {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * toTimestampMs의 핵심 비즈니스 로직을 수행합니다.
 * @param dateInput 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const toTimestampMs = (dateInput: string): number => {
  const parsed = Date.parse(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) {
    throw new Error("유효한 날짜를 입력해 주세요.");
  }
  return parsed;
};

/**
 * toPositiveInteger의 핵심 비즈니스 로직을 수행합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @param label 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const toPositiveInteger = (value: string, label: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
};

/**
 * readErrorMessage 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
 * @param error 에러 상황을 나타내는 객체입니다.
 * @returns 조회한 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "요청 처리 중 오류가 발생했습니다.";
};

export const ADMIN_USER_ROLE_OPTIONS = [
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  "unverified",
] as const;
