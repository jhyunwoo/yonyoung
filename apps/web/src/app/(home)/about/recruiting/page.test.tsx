import React from "react";
import { describe, expect, it } from "vitest";

Object.assign(globalThis, { React });

describe("RecruitingPage", () => {
  it("페이지 자체에는 추가 상단 여백만 남기고 헤더 오프셋은 레이아웃에서 처리한다", async () => {
    const { default: RecruitingPage } = await import("./page");
    const result = RecruitingPage();

    expect(result?.props.className).toContain("px-4");
    expect(result?.props.className).toContain("pb-16");
    expect(result?.props.className).not.toContain("pt-");
  });
});
