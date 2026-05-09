import "server-only";

export class FetchTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export const fetchWithTimeout = async (
  input: URL | RequestInfo,
  init: RequestInit,
  timeoutMs = 10_000,
): Promise<Response> => {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const requestInit = { ...init };
  let didTimeout = false;

  delete requestInit.signal;

  const abortFromUpstreamSignal = () => {
    controller.abort(upstreamSignal?.reason);
  };

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      abortFromUpstreamSignal();
    } else {
      upstreamSignal.addEventListener("abort", abortFromUpstreamSignal, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (didTimeout && error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError(timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", abortFromUpstreamSignal);
  }
};
