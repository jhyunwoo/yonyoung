import React from "react";
import { describe, expect, it } from "vitest";

Object.assign(globalThis, { React });

describe("PublicHeaderSafeArea", () => {
  it("헤더 높이 토큰 기반 상단 안전영역 클래스를 적용한다", async () => {
    const { default: PublicHeaderSafeArea } = await import("./public-header-safe-area");
    const result = PublicHeaderSafeArea({
      children: <div data-testid="child-node" />,
    });

    expect(result?.props.className).toContain("pt-[var(--public-header-height-mobile)]");
    expect(result?.props.className).toContain("md:pt-[var(--public-header-height-desktop)]");
    expect(result?.props["data-testid"]).toBe("public-header-safe-area");
  });
});
