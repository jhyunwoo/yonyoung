import { AdminApiError } from "@/shared/http/http";

/** 사용자에게 보여 줄 오류 문구를 고른다. API 오류의 메시지를 우선하고, 없으면 fallback 을 쓴다. */
export const readErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
};
