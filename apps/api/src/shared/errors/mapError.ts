import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { MissingStorageConfigError } from "../../lib/storage/presign";
import { AppError, isAppError } from "./AppError";
import { ERROR_CODES, type ErrorCode } from "./errorCodes";

type LegacyHttpErrorLike = {
  status: number;
  code: string;
  message: string;
  expose?: boolean;
};

const MALFORMED_JSON_MESSAGES = [
  "Unexpected end of JSON input",
  "Unexpected token",
  "Malformed JSON",
  "JSON",
] as const;

const isLegacyHttpError = (error: unknown): error is LegacyHttpErrorLike => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as Partial<LegacyHttpErrorLike>;
  return (
    typeof candidate.status === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
};

const mapLegacyHttpError = (error: LegacyHttpErrorLike): AppError => {
  const resolvedCode = (Object.values(ERROR_CODES) as string[]).includes(
    error.code,
  )
    ? (error.code as ErrorCode)
    : ERROR_CODES.INTERNAL_ERROR;

  return new AppError({
    httpStatus: error.status,
    code: resolvedCode,
    message: error.message,
    expose: error.expose,
  });
};

/**
 * 요청 본문 JSON 파싱 실패만 400으로 본다. 메시지에 "JSON"이 들어간 임의의 오류까지
 * 400으로 돌리면 서버 버그가 클라이언트 잘못처럼 보이고 로그·Sentry에도 남지 않는다.
 */
const looksLikeMalformedJson = (error: Error): boolean => {
  return (
    error instanceof SyntaxError &&
    MALFORMED_JSON_MESSAGES.some((needle) => error.message.includes(needle))
  );
};

type StatusCodeError = Error & { statusCode: number };

/**
 * Better Auth(better-call)의 APIError처럼 HTTP 상태 코드를 직접 들고 있는 오류.
 * 예전에는 메시지에 "auth"/"session"이 있으면 무조건 401로 바꿨는데, 설정 누락
 * ("BETTER_AUTH_SECRET is not set")이나 코드 버그("reading 'session'")까지 조용한 401이
 * 되어 관리자가 이유 없이 로그인 화면으로 튕기고 원인은 어디에도 기록되지 않았다.
 * 이제 상태 코드를 명시한 오류만 그대로 따르고, 나머지는 기록되는 500으로 둔다.
 */
const isClientStatusCodeError = (error: Error): error is StatusCodeError => {
  const statusCode = (error as Partial<StatusCodeError>).statusCode;
  return (
    error.name === "APIError" &&
    typeof statusCode === "number" &&
    statusCode >= 400 &&
    statusCode < 500
  );
};

/** 존재하지 않는(또는 삭제된) 기수 등 다른 행을 가리키는 id — 충돌(409)이 아니라 잘못된 요청이다. */
const looksLikeForeignKeyViolation = (error: Error): boolean =>
  error.message.toLowerCase().includes("foreign key constraint");

const looksLikeD1ConstraintError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("sqlite_constraint") ||
    message.includes("constraint failed") ||
    message.includes("unique constraint")
  );
};

const looksLikeD1Error = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("d1") ||
    message.includes("sqlite") ||
    message.includes("drizzle")
  );
};

const looksLikeR2NotFoundError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("nosuchkey") ||
    message.includes("the specified key does not exist") ||
    message.includes("object not found")
  );
};

const looksLikeR2TooLargeError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("entitytoolarge") ||
    message.includes("metadatatoolarge") ||
    message.includes("too large")
  );
};

const looksLikeR2Error = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes("r2") ||
    message.includes("cloudflare object storage") ||
    message.includes("s3")
  );
};

export const mapErrorToAppError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof MissingStorageConfigError) {
    return new AppError({
      httpStatus: 500,
      code: ERROR_CODES.R2_ERROR,
      message: error.message,
      expose: true,
      details: { missingKeys: error.missingKeys },
      cause: error,
    });
  }

  if (error instanceof ZodError) {
    return AppError.validation("요청 데이터가 올바르지 않습니다.", {
      issues: error.issues.map((issue) => ({
        path: issue.path,
        code: issue.code,
        message: issue.message,
      })),
    });
  }

  if (error instanceof HTTPException) {
    return new AppError({
      httpStatus: error.status,
      code:
        error.status >= 500
          ? ERROR_CODES.INTERNAL_ERROR
          : ERROR_CODES.BAD_REQUEST,
      message: error.message || "요청 처리 중 오류가 발생했습니다.",
      expose: error.status < 500,
      cause: error,
    });
  }

  if (isLegacyHttpError(error)) {
    return mapLegacyHttpError(error);
  }

  if (error instanceof Error) {
    if (looksLikeMalformedJson(error)) {
      return AppError.badRequest("Malformed JSON body", {
        originalMessage: error.message,
      });
    }

    if (isClientStatusCodeError(error)) {
      const isAuthStatus = error.statusCode === 401 || error.statusCode === 403;
      return new AppError({
        httpStatus: error.statusCode,
        code: isAuthStatus ? ERROR_CODES.AUTH_ERROR : ERROR_CODES.BAD_REQUEST,
        message: isAuthStatus
          ? "인증 정보가 유효하지 않습니다."
          : error.message || "요청을 처리할 수 없습니다.",
        cause: error,
      });
    }

    if (looksLikeForeignKeyViolation(error)) {
      return new AppError({
        httpStatus: 400,
        code: ERROR_CODES.BAD_REQUEST,
        message:
          "연결하려는 항목(기수 등)을 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.",
        details: { reason: "foreign_key_violation" },
        cause: error,
      });
    }

    if (looksLikeD1ConstraintError(error)) {
      return new AppError({
        httpStatus: 409,
        code: ERROR_CODES.DB_ERROR,
        message: "데이터 무결성 제약 조건을 위반했습니다.",
        details: { reason: "constraint_violation" },
        cause: error,
      });
    }

    if (looksLikeD1Error(error)) {
      return new AppError({
        httpStatus: 500,
        code: ERROR_CODES.DB_ERROR,
        message: "데이터베이스 처리 중 오류가 발생했습니다.",
        expose: false,
        cause: error,
      });
    }

    if (looksLikeR2NotFoundError(error)) {
      return new AppError({
        httpStatus: 404,
        code: ERROR_CODES.R2_ERROR,
        message: "요청한 스토리지 객체를 찾을 수 없습니다.",
        details: { reason: "object_not_found" },
        cause: error,
      });
    }

    if (looksLikeR2TooLargeError(error)) {
      return new AppError({
        httpStatus: 413,
        code: ERROR_CODES.R2_ERROR,
        message: "스토리지 처리 제한을 초과했습니다.",
        details: { reason: "payload_too_large" },
        cause: error,
      });
    }

    if (looksLikeR2Error(error)) {
      return new AppError({
        httpStatus: 500,
        code: ERROR_CODES.R2_ERROR,
        message: "스토리지 처리 중 오류가 발생했습니다.",
        expose: false,
        cause: error,
      });
    }

    return AppError.internal(
      "서버 내부 오류가 발생했습니다.",
      undefined,
      error,
    );
  }

  return AppError.internal("서버 내부 오류가 발생했습니다.", undefined, error);
};
