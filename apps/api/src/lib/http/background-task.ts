import type { Context } from "hono";
import type HonoAppType from "../../types/honoAppType";

type FallbackMode = "await" | "fire-and-forget";

type BackgroundTaskOptions = {
  fallback?: FallbackMode;
  onError?: (error: unknown) => void;
};

const swallowError = (error: unknown, onError?: (error: unknown) => void) => {
  if (onError) {
    onError(error);
  }
};

const resolveExecutionContext = (
  c: Context<HonoAppType>,
): ExecutionContext | undefined => {
  try {
    return (c as unknown as { executionCtx?: ExecutionContext }).executionCtx;
  } catch {
    return undefined;
  }
};

export const runInBackground = async (
  c: Context<HonoAppType>,
  task: Promise<unknown>,
  options?: BackgroundTaskOptions,
): Promise<void> => {
  const fallback = options?.fallback ?? "fire-and-forget";
  const wrappedTask = task.catch((error) => {
    swallowError(error, options?.onError);
  });

  const executionCtx = resolveExecutionContext(c);
  if (executionCtx && typeof executionCtx.waitUntil === "function") {
    executionCtx.waitUntil(wrappedTask);
    return;
  }

  if (fallback === "await") {
    await wrappedTask;
    return;
  }

  void wrappedTask;
};
