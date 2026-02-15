import { AdminApiError } from "../../../../lib/admin-api/types";

export const formatTimestamp = (value: number): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ko-KR");
};

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

export const toTimestampMs = (dateInput: string): number => {
  const parsed = Date.parse(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) {
    throw new Error("유효한 날짜를 입력해 주세요.");
  }
  return parsed;
};

export const toPositiveInteger = (value: string, label: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
};

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
