import { z } from "zod";

import type { CoreRole } from "../auth-roles";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
};

export type DataEnvelope<T> = {
  data: T;
};

export type ApiKnownRole = CoreRole | "member";
export type ApiRole = ApiKnownRole | (string & {});

export const apiRoleSchema = z.string();

export const apiTimestampSchema = z.number().finite();

/**
 * 세부 이미지 일괄 추가·순서 변경 요청 한 번에 담을 수 있는 최대 장수.
 * 비정상적으로 큰 요청을 막는 상한이며, 웹과 API가 같은 값을 쓴다.
 */
export const IMAGE_BATCH_MAX_ITEMS = 500;
export const apiNullableStringSchema = z.string().nullable();
