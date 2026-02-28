import React from "react";
import { describe, expect, it } from "vitest";

Object.assign(globalThis, { React });

describe("RecruitingPage", () => {
  it("상단 제목을 donate 기준 헤더 스타일로 렌더링한다", async () => {
    const { default: RecruitingPage } = await import("./page");
    const result = RecruitingPage();
    const rootClassName = result?.props.className as string;
    const container = result?.props.children as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    const [header] = React.Children.toArray(container.props.children) as React.ReactElement<{
      title?: string;
      description?: React.ReactNode;
    }>[];

    expect(header).toBeDefined();
    if (!header) {
      throw new Error("PageTitleHero 컴포넌트를 찾을 수 없습니다.");
    }

    const headerComponentType = header.type as { name?: string };

    expect(rootClassName).toContain("min-h-screen");
    expect(rootClassName).toContain("bg-white");
    expect(rootClassName).not.toContain("pt-");
    expect(headerComponentType.name).toBe("PageTitleHero");
    expect(header.props.title).toBe("RECRUITING");
    expect(header.props.description).toBe("연영회 모집 안내");
  });
});
