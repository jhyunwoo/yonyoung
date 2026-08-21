import { z } from "zod";

import type { CoreRole } from "@/shared/contracts/auth-roles";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "TOO_MANY_REQUESTS",
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

export type ApiKnownRole = CoreRole;
export type ApiRole = ApiKnownRole | (string & {});

export const apiRoleSchema = z.string();

export const apiTimestampSchema = z.number().finite();
export const apiNullableStringSchema = z.string().nullable();
