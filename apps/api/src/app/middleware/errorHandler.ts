import { captureException } from "@sentry/cloudflare";
import type { ErrorHandler } from "hono";
import type HonoAppType from "../../types/honoAppType";
import { mapErrorToAppError } from "../../shared/errors/mapError";
import { toErrorResponse } from "../../shared/errors/httpProblem";
import { logError } from "./logger";

export const errorHandler: ErrorHandler<HonoAppType> = (error, c) => {
  const mapped = mapErrorToAppError(error);

  if (mapped.httpStatus >= 500 && c.env?.SENTRY_DSN) {
    captureException(error, {
      tags: { requestId: c.get("requestId"), code: mapped.code },
    });
  }

  if (mapped.httpStatus >= 500 && !mapped.expose) {
    logError(c, error);
  }

  return toErrorResponse(c, mapped);
};
