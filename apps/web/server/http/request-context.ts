import "server-only";
import { headers as readHeaders } from "next/headers";
import {
  resolveForwardedRequestContext,
  type ForwardedRequestContext,
} from "@/shared/http/http";

export const readServerForwardedRequestContext =
  async (): Promise<ForwardedRequestContext> => {
    const requestHeaders = await readHeaders();

    return resolveForwardedRequestContext({
      host: requestHeaders.get("host"),
      forwardedHost: requestHeaders.get("x-forwarded-host"),
      forwardedProto: requestHeaders.get("x-forwarded-proto"),
      origin: requestHeaders.get("origin"),
    });
  };

/** 요청 추적용 상관관계 헤더(x-request-id/x-trace-id)를 읽거나 새로 만듭니다. */
export const readCorrelationHeaders = async (): Promise<{
  requestId: string;
  traceId: string;
}> => {
  const requestHeaders = await readHeaders();
  const requestId = requestHeaders.get("x-request-id")?.trim() || crypto.randomUUID();
  const traceId = requestHeaders.get("x-trace-id")?.trim() || crypto.randomUUID();

  return {
    requestId,
    traceId,
  };
};
