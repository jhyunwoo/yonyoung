import { initializeBrowserSentry } from "@/lib/observability/sentry-client";
import { shouldSample } from "@/lib/observability/sampling";

/*
  SDK 청크(전송 약 160KB)가 첫 화면과 대역폭·메인 스레드를 다투면 모바일 LCP 가 밀린다
  (SEO 감사, Lighthouse 모바일). load 뒤 유휴 시간에 받는다. 그 전에 난 오류는 아래
  client-error beacon 이 보고하고, 오류 화면은 captureBrowserException 이 즉시 초기화한다.
*/
const initializeSentryWhenIdle = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const start = () => void initializeBrowserSentry();
  const startWhenIdle = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 5000 });
    } else {
      setTimeout(start, 2000);
    }
  };

  if (document.readyState === "complete") {
    startWhenIdle();
  } else {
    window.addEventListener("load", startWhenIdle, { once: true });
  }
};

initializeSentryWhenIdle();

type ClientErrorPayload = {
  event: "client.error" | "client.unhandledrejection" | "router.transition.start";
  path: string;
  message?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  sampledAt: number;
};

const ENDPOINT = "/api/internal/client-error";
const SAMPLE_RATE = 0.2;
const FLAG_KEY = "__yy_client_instrumentation_registered";

const report = (payload: ClientErrorPayload): void => {
  if (
    !shouldSample(
      SAMPLE_RATE,
      `${payload.event}:${payload.path}:${payload.message ?? ""}`,
    )
  ) {
    return;
  }

  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(
      ENDPOINT,
      new Blob([body], { type: "application/json; charset=UTF-8" }),
    );
    return;
  }

  void fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  });
};

const getPath = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.pathname}${window.location.search}`;
};

const toMessage = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  return "Unknown client error";
};

const toStack = (value: unknown): string | undefined => {
  if (value instanceof Error && typeof value.stack === "string") {
    return value.stack;
  }

  return undefined;
};

const registerGlobalClientErrorHandlers = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const globalWindow = window as Window & { [FLAG_KEY]?: boolean };
  if (globalWindow[FLAG_KEY]) {
    return;
  }

  globalWindow[FLAG_KEY] = true;

  window.addEventListener("error", (event) => {
    report({
      event: "client.error",
      path: getPath(),
      message: event.message || toMessage(event.error),
      stack: toStack(event.error),
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      sampledAt: Date.now(),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    report({
      event: "client.unhandledrejection",
      path: getPath(),
      message: toMessage(event.reason),
      stack: toStack(event.reason),
      sampledAt: Date.now(),
    });
  });
};

registerGlobalClientErrorHandlers();

export const onRouterTransitionStart = (
  url: string,
  navigationType: "push" | "replace" | "traverse",
): void => {
  report({
    event: "router.transition.start",
    path: getPath(),
    metadata: {
      url,
      navigationType,
    },
    sampledAt: Date.now(),
  });
};
