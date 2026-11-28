import { DrizzleQueryError } from "drizzle-orm/errors";

/**
 * drizzle은 batch가 아닌 쿼리가 실패하면 DrizzleQueryError로 감싼다. 그 메시지는
 * "Failed query: <sql>" 다음 줄에 "params: <바인딩 값>"이 오고, 실제 D1 오류는 cause에만 있다.
 * 감싼 메시지로 오류를 분류하면 제약 조건 위반을 놓치고, 바인딩 값(이름·전화번호 등)에
 * 우연히 들어간 단어로 분류가 바뀐다. 분류할 때는 항상 이 함수로 실제 오류를 꺼낸다.
 */
export const unwrapQueryError = (error: Error): Error =>
  error instanceof DrizzleQueryError && error.cause instanceof Error
    ? error.cause
    : error;

/** 실패한 쿼리 메시지에서 SQL은 남기고 바인딩 값(개인정보일 수 있다)만 지운다. */
export const redactQueryParams = (message: string): string =>
  message.replace(/(Failed query: [\s\S]*?\nparams: )[\s\S]*$/, "$1[REDACTED]");
