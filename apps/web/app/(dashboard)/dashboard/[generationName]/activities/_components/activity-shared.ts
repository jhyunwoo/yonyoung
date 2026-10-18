import { readErrorMessage } from "@/shared/http/read-error-message";

export const readActivityErrorMessage = (error: unknown): string =>
  readErrorMessage(error, "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
