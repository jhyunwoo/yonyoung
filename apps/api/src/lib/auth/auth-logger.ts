import { logger } from "../../shared/logging/logger";

/**
 * Better Auth 로그를 앱 로거로 보낸다. 기본 로거는 오류 객체를 console에 그대로 찍어서,
 * 세션·계정 쿼리가 실패하면 바인딩 값(세션 토큰, 이메일, Google 토큰)이 Workers 로그에 남는다.
 * 앱 로거는 실패한 쿼리의 바인딩 값을 지운다. 오류는 메시지만 남기고, 문자열이 아닌 값은
 * 무엇이 들어 있을지 알 수 없으므로 버린다.
 */
export const logBetterAuthMessage = (
  level: "debug" | "info" | "warn" | "error",
  message: string,
  ...args: unknown[]
): void => {
  logger[level]({
    event: "auth.log",
    message,
    details: args.flatMap((arg) => {
      if (arg instanceof Error) {
        return [arg.message];
      }
      return typeof arg === "string" ? [arg] : [];
    }),
  });
};
