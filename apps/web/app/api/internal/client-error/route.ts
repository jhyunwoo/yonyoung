import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/server/observability/logger";
import {
  normalizeObservedRoute,
  summarizeClientErrorForLog,
  summarizeRouterTransitionForLog,
} from "@/server/observability/client-telemetry";
import {
  INTERNAL_EVENT_BODY_LIMIT_BYTES,
  enforceRequestBodyLimit,
  enforceSameOriginProtection,
} from "@/server/security/request-guards";
import {
  createIngestAcceptedResponse,
  createIngestLogBudget,
  parseIngestBody,
  readCorrelationHeader,
} from "@/app/api/internal/ingest-request";

const clientErrorPayloadSchema = z.object({
  event: z.enum(["client.error", "client.unhandledrejection", "router.transition.start"]),
  path: z.string().min(1),
  message: z.string().optional(),
  stack: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sampledAt: z.number().finite(),
});

const allowIngestLog = createIngestLogBudget();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const csrfProtectionResponse = enforceSameOriginProtection(request);
  if (csrfProtectionResponse) {
    return csrfProtectionResponse;
  }

  const bodyLimitResponse = await enforceRequestBodyLimit(
    request,
    INTERNAL_EVENT_BODY_LIMIT_BYTES,
  );
  if (bodyLimitResponse) {
    return bodyLimitResponse;
  }

  const body = await parseIngestBody(request);
  const parsed = clientErrorPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!allowIngestLog(request)) {
    return createIngestAcceptedResponse();
  }

  const requestId = readCorrelationHeader(request, "x-request-id");
  const traceId = readCorrelationHeader(request, "x-trace-id");
  const route = normalizeObservedRoute(parsed.data.path);

  const baseLogPayload = {
    event: parsed.data.event,
    route,
    status: 202,
    requestId,
    traceId,
    ingestPath: request.nextUrl.pathname,
    ingestMethod: request.method,
  };

  if (parsed.data.event === "router.transition.start") {
    logger.info({
      ...baseLogPayload,
      transition: summarizeRouterTransitionForLog(parsed.data),
    });
  } else {
    logger.warn({
      ...baseLogPayload,
      error: summarizeClientErrorForLog(parsed.data),
    });
  }

  return createIngestAcceptedResponse();
}
