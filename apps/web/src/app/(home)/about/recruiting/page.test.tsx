import React from "react";
import { beforeEach, vi } from "vitest";
import { describe, expect, it } from "vitest";

const { getPublicCurrentRecruitingPlanMock } = vi.hoisted(() => ({
  getPublicCurrentRecruitingPlanMock: vi.fn(),
}));
const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("../../../../lib/public-api", () => ({
  getPublicCurrentRecruitingPlan: getPublicCurrentRecruitingPlanMock,
}));
vi.mock("next/headers", () => ({
  headers: headersMock,
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

const collectNodeText = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => collectNodeText(child)).join("");
  }

  if (!React.isValidElement(node)) {
    return "";
  }

  return collectNodeText((node.props as { children?: React.ReactNode }).children);
};

describe("RecruitingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublicCurrentRecruitingPlanMock.mockResolvedValue(null);
    headersMock.mockResolvedValue(new Headers());
  });

  it("상단 제목을 donate 기준 헤더 스타일로 렌더링한다", async () => {
    const { default: RecruitingPage } = await import("./page");
    const result = await RecruitingPage();
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
    expect(rootClassName).toContain("bg-(--bg-primary)");
    expect(rootClassName).not.toContain("pt-");
    expect(headerComponentType.name).toBe("PageTitleHero");
    expect(header.props.title).toBe("RECRUITING");
    expect(header.props.description).toBe("연영회 모집 안내");
  });

  it("문의 섹션을 노출하지 않고 모집 계획 미설정 안내를 표시한다", async () => {
    const { default: RecruitingPage } = await import("./page");
    const result = await RecruitingPage();

    const contactSection = findElementByTestId(result, "about-recruiting-contact");
    const emptyState = findElementByTestId(result, "about-recruiting-plan-empty");

    expect(contactSection).toBeNull();
    expect(emptyState).not.toBeNull();
    expect(collectNodeText(emptyState)).toContain("올해 모집 계획 준비 중");
  });

  it("모집 계획이 있으면 제목/상태를 노출하고 빈 상태 카드는 숨긴다", async () => {
    const now = Date.now();

    getPublicCurrentRecruitingPlanMock.mockResolvedValue({
      year: 2030,
      title: "2030 연영회 신입 부원 모집",
      content: "<p>모집 세부 내용</p>",
      promotionImageUrls: ["https://example.com/recruiting-1.jpg"],
      recruitmentStartAt: now - 60_000,
      recruitmentEndAt: now + 60_000,
      createdAt: Date.parse("2029-12-01T00:00:00.000Z"),
      updatedAt: Date.parse("2029-12-10T00:00:00.000Z"),
    });

    const { default: RecruitingPage } = await import("./page");
    const result = await RecruitingPage();
    const pageText = collectNodeText(result);
    const emptyState = findElementByTestId(result, "about-recruiting-plan-empty");

    expect(pageText).toContain("2030 연영회 신입 부원 모집");
    expect(pageText).toContain("모집중");
    expect(emptyState).toBeNull();
  });
});
