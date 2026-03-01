import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("CurrentYear", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-07-12T00:00:00.000Z"));
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("현재 연도를 텍스트로 렌더링한다", async () => {
    const { default: CurrentYear } = await import("./current-year");

    await act(async () => {
      root.render(<CurrentYear />);
      await Promise.resolve();
    });

    expect(container.textContent).toBe("2031");
  });
});
