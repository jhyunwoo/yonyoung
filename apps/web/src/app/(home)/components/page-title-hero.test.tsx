import React from "react";
import { describe, expect, it } from "vitest";

Object.assign(globalThis, { React });

describe("PageTitleHero", () => {
  it("donate 페이지와 동일한 제목 스타일 토큰을 적용한다", async () => {
    const { default: PageTitleHero } = await import("./page-title-hero");
    const result = PageTitleHero({ title: "테스트 제목", description: "설명" }) as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;
    const children = React.Children.toArray(result.props.children) as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>[];
    const heading = children[0];
    const description = children[1];

    expect(heading).toBeDefined();
    expect(description).toBeDefined();
    if (!heading || !description) {
      throw new Error("제목 혹은 설명 노드를 찾을 수 없습니다.");
    }

    expect(result.props.className).toContain("mb-16");
    expect(result.props.className).toContain("border-b");
    expect(result.props.className).toContain("border-(--surface-border)");
    expect(result.props.className).toContain("text-center");

    expect(heading.props.className).toContain("text-[2rem]");
    expect(heading.props.className).toContain("font-bold");
    expect(heading.props.className).toContain("text-(--text-primary)");
    expect(heading.props.children).toBe("테스트 제목");

    expect(description.props.className).toContain("text-lg");
    expect(description.props.className).toContain("text-(--text-muted)");
    expect(description.props.children).toBe("설명");
  });

  it("description이 없으면 설명 문단을 렌더링하지 않는다", async () => {
    const { default: PageTitleHero } = await import("./page-title-hero");
    const result = PageTitleHero({ title: "테스트 제목" }) as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    const children = React.Children.toArray(result.props.children);

    expect(children).toHaveLength(1);
  });
});
