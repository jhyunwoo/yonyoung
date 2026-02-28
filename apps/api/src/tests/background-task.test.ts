import type { Context } from "hono";
import { describe, expect, it, vi } from "vitest";
import { runInBackground } from "../lib/http/background-task";
import type HonoAppType from "../types/honoAppType";

const createContext = (
  input?: {
    executionCtx?: ExecutionContext;
    throwOnExecutionCtx?: boolean;
  },
): Context<HonoAppType> => {
  const context = {} as {
    executionCtx?: ExecutionContext;
  };

  if (input?.throwOnExecutionCtx) {
    Object.defineProperty(context, "executionCtx", {
      get: () => {
        throw new Error("This context has no ExecutionContext");
      },
    });
  } else if (input?.executionCtx) {
    context.executionCtx = input.executionCtx;
  }

  return context as unknown as Context<HonoAppType>;
};

describe("runInBackground", () => {
  it("executionCtx 접근 시 예외가 나도 fallback await로 작업을 처리한다", async () => {
    const task = vi.fn(async () => undefined);

    await expect(
      runInBackground(createContext({ throwOnExecutionCtx: true }), task(), {
        fallback: "await",
      }),
    ).resolves.toBeUndefined();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("executionCtx.waitUntil이 있으면 비동기 작업을 등록한다", async () => {
    const waitUntil = vi.fn<(promise: Promise<unknown>) => void>();
    const executionCtx = {
      waitUntil,
    } as unknown as ExecutionContext;
    const task = Promise.resolve("ok");

    await runInBackground(createContext({ executionCtx }), task);

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil.mock.calls[0]?.[0]).toBeInstanceOf(Promise);
  });
});
