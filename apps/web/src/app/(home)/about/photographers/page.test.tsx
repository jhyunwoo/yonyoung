import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicPhotographersMock, safeListMock } = vi.hoisted(() => ({
  listPublicPhotographersMock: vi.fn(),
  safeListMock: vi.fn(),
}));

vi.mock("../../../../lib/public-api", () => ({
  listPublicPhotographers: listPublicPhotographersMock,
  safeList: safeListMock,
}));

Object.assign(globalThis, { React });

const findElementByTestId = (
  node: React.ReactNode,
  testId: string,
): React.ReactElement | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const matched = findElementByTestId(child, testId);
      if (matched) {
        return matched;
      }
    }
    return null;
  }

  if (!React.isValidElement(node)) {
    return null;
  }

  const props = node.props as { children?: React.ReactNode; "data-testid"?: string };
  if (props["data-testid"] === testId) {
    return node;
  }

  return findElementByTestId(props.children, testId);
};

describe("PhotographersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    safeListMock.mockResolvedValue([]);
  });

  it("레이아웃 safe-area를 제외한 추가 상단 여백만 사용한다", async () => {
    const { default: PhotographersPage } = await import("./page");
    const result = await PhotographersPage();
    const main = findElementByTestId(result, "about-photographers-main");
    const mainProps = main?.props as { className?: string } | undefined;

    expect(result?.props.className).not.toContain("pt-[72px]");
    expect(result?.props.className).toContain("md:pt-10");
    expect(mainProps?.className).toContain("max-w-300");
    expect(mainProps?.className).toContain("px-4");
    expect(mainProps?.className).toContain("md:px-8");
  });

  it("기수 앵커 이동 시 헤더 높이 토큰 기반 스크롤 여백을 둔다", async () => {
    safeListMock.mockResolvedValue([
      {
        id: "generation-1",
        sortOrder: 899087,
        name: "899087기",
        startDate: Date.UTC(2025, 2, 1),
        endDate: Date.UTC(2026, 1, 28),
        members: [],
      },
    ]);

    const { default: PhotographersPage } = await import("./page");
    const result = await PhotographersPage();
    const generationArticle = findElementByTestId(
      result,
      "about-photographers-generation-generation-1",
    );
    const generationProps = generationArticle?.props as
      | { id?: string; className?: string }
      | undefined;

    expect(generationProps?.id).toBe("gen-899087");
    expect(generationProps?.className).toContain(
      "scroll-mt-[calc(var(--public-header-height-mobile)+16px)]",
    );
    expect(generationProps?.className).toContain(
      "md:scroll-mt-[calc(var(--public-header-height-desktop)+40px)]",
    );
  });
});
