/* eslint-disable @next/next/no-img-element */
import type { ApiPublicGenerationWithMembers } from "@repo/shared-api-contracts";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = {
      ...props,
    } as Record<string, unknown>;
    const unoptimized = Boolean(rest.unoptimized);
    delete rest.fill;
    delete rest.unoptimized;
    return (
      <img
        data-unoptimized={String(unoptimized)}
        {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  },
}));

vi.mock("framer-motion", () => {
  const toDomSafeProps = (props: Record<string, unknown>) => {
    const next = { ...props };
    delete next.layout;
    delete next.initial;
    delete next.animate;
    delete next.exit;
    delete next.transition;
    return next;
  };

  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) => {
        return ({ children, ...props }: { children?: React.ReactNode }) =>
          React.createElement(tag, toDomSafeProps(props), children);
      },
    },
  ) as Record<string, (props: { children?: React.ReactNode }) => React.ReactElement>;

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    motion,
    useReducedMotion: () => false,
  };
});

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const generationFixture: ApiPublicGenerationWithMembers = {
  id: "generation-60",
  name: "00000000-0000-4000-8000-000000000060",
  sortOrder: 60,
  startDate: Date.parse("2030-03-01T00:00:00.000Z"),
  endDate: Date.parse("2031-02-28T00:00:00.000Z"),
  members: [
    {
      id: "member-1",
      generationId: "generation-60",
      name: "legacy-name",
      familyName: "홍",
      givenName: "길동",
      image: "https://example.com/member-1.jpg",
      showcaseImageUrls: [
        "https://example.com/member-1-showcase-1.jpg",
        "https://example.com/member-1-showcase-2.jpg",
      ],
      collaborationAvailable: true,
      personalLink: "https://example.com/member-1",
      role: "president",
    },
    {
      id: "member-2",
      generationId: "generation-60",
      name: "김 연 영",
      familyName: null,
      givenName: null,
      image: null,
      showcaseImageUrls: [],
      collaborationAvailable: false,
      personalLink: null,
      role: "regular_member",
    },
  ],
};

describe("GenerationMembersGrid", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("프로필 이미지를 축소된 원형으로 노출하고 이름을 이미지 아래에 배치한다", async () => {
    const { default: GenerationMembersGrid } = await import("./generation-members-grid");

    await act(async () => {
      root.render(<GenerationMembersGrid generation={generationFixture} />);
      await Promise.resolve();
    });

    const avatar = container.querySelector("[data-testid='about-photographers-member-avatar-member-1']");
    const nameOverlay = container.querySelector(
      "[data-testid='about-photographers-member-name-member-1']",
    );
    const membersList = container.querySelector("ul");

    expect(membersList).toBeInTheDocument();
    expect(membersList?.className).toContain("gap-y-6");
    expect(avatar).toBeInTheDocument();
    expect(avatar?.className).toContain("rounded-full");
    expect(avatar?.className).toContain("h-24");
    expect(avatar?.className).toContain("w-24");
    expect(avatar?.className).toContain("border-[#2f3763]");
    expect(nameOverlay).toBeInTheDocument();
    expect(nameOverlay?.className).toContain("text-base");
    expect(nameOverlay?.className).toContain("md:text-xl");
    expect(nameOverlay?.className).not.toContain("absolute");
    expect(nameOverlay).toHaveTextContent("홍길동");
    expect(
      container.querySelector("[data-testid='about-photographers-member-name-member-2']"),
    ).toHaveTextContent("김연영");
  });

  it("카드를 클릭하면 사용자 정보 모달이 열리고 닫을 수 있다", async () => {
    const { default: GenerationMembersGrid } = await import("./generation-members-grid");

    await act(async () => {
      root.render(<GenerationMembersGrid generation={generationFixture} />);
      await Promise.resolve();
    });

    const memberButton = container.querySelector(
      "[data-testid='about-photographers-member-button-member-1']",
    );
    expect(memberButton).toBeInTheDocument();

    await act(async () => {
      memberButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const modal = container.querySelector("[data-testid='about-photographers-member-modal']");
    const modalCard = container.querySelector(
      "[data-testid='about-photographers-member-modal-card']",
    );
    const modalContent = container.querySelector(
      "[data-testid='about-photographers-member-modal-content']",
    );
    expect(modal).toBeInTheDocument();
    expect(modalCard).toBeInTheDocument();
    expect(modalContent).toBeInTheDocument();
    expect(modal?.className).toContain("backdrop-blur-sm");
    expect(modal?.className).toContain("bg-black/60");
    expect(modal?.className).toContain("items-end");
    expect(modal?.className).toContain("sm:items-center");
    expect(modalCard?.className).toContain("rounded-2xl");
    expect(modalCard?.className).toContain("will-change-transform");
    expect(modalCard?.className).toContain("max-h-[calc(100dvh-1.5rem)]");
    expect(modalCard?.className).toContain("sm:max-h-[calc(100dvh-4rem)]");
    expect(modalCard?.className).toContain("flex");
    expect(modalCard?.className).toContain("flex-col");
    expect(modalContent?.className).toContain("overflow-y-auto");
    expect(modalContent?.className).toContain("overscroll-contain");
    expect(modal).toHaveTextContent("홍길동");
    expect(modal).toHaveTextContent("60기");
    expect(modal).toHaveTextContent("회장");
    expect(modal).toHaveTextContent("협업 가능 여부");
    expect(modal).toHaveTextContent("가능");
    expect(modal).toHaveTextContent("개인 링크");
    expect(modal).toHaveTextContent("바로가기");
    expect(modal).not.toHaveTextContent("00000000-0000-4000-8000-000000000060");
    const collaborationStatus = container.querySelector(
      "[data-testid='about-photographers-member-collaboration-status']",
    );
    expect(collaborationStatus).toBeInTheDocument();
    expect(collaborationStatus).toHaveTextContent("가능");
    expect(collaborationStatus?.className).toContain("bg-emerald-50");
    expect(collaborationStatus?.className).toContain("text-emerald-700");

    const closeButton = container.querySelector(
      "[data-testid='about-photographers-member-modal-close']",
    );

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(
      container.querySelector("[data-testid='about-photographers-member-modal']"),
    ).not.toBeInTheDocument();
  });

  it("협업 가능 여부를 상태 배지 색상으로 구분한다", async () => {
    const { default: GenerationMembersGrid } = await import("./generation-members-grid");

    await act(async () => {
      root.render(<GenerationMembersGrid generation={generationFixture} />);
      await Promise.resolve();
    });

    const memberButton = container.querySelector(
      "[data-testid='about-photographers-member-button-member-2']",
    );
    expect(memberButton).toBeInTheDocument();

    await act(async () => {
      memberButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const collaborationStatus = container.querySelector(
      "[data-testid='about-photographers-member-collaboration-status']",
    );
    expect(collaborationStatus).toBeInTheDocument();
    expect(collaborationStatus).toHaveTextContent("불가");
    expect(collaborationStatus?.className).toContain("bg-rose-50");
    expect(collaborationStatus?.className).toContain("text-rose-700");
  });

  it("모달에서 대표 작품 사진 갤러리를 노출한다", async () => {
    const { default: GenerationMembersGrid } = await import("./generation-members-grid");

    await act(async () => {
      root.render(<GenerationMembersGrid generation={generationFixture} />);
      await Promise.resolve();
    });

    const memberButton = container.querySelector(
      "[data-testid='about-photographers-member-button-member-1']",
    );
    expect(memberButton).toBeInTheDocument();

    await act(async () => {
      memberButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const showcaseSection = container.querySelector(
      "[data-testid='about-photographers-member-showcase-section']",
    );
    const showcaseItems = container.querySelectorAll(
      "[data-testid^='about-photographers-member-showcase-item-']",
    );

    expect(showcaseSection).toBeInTheDocument();
    expect(showcaseSection).toHaveTextContent("대표 작품 사진");
    expect(showcaseItems).toHaveLength(2);
    expect(
      container.querySelector("[data-testid='about-photographers-member-showcase-empty']"),
    ).not.toBeInTheDocument();
  });

  it("대표 작품 사진이 없으면 empty state 문구를 노출한다", async () => {
    const { default: GenerationMembersGrid } = await import("./generation-members-grid");

    await act(async () => {
      root.render(<GenerationMembersGrid generation={generationFixture} />);
      await Promise.resolve();
    });

    const memberButton = container.querySelector(
      "[data-testid='about-photographers-member-button-member-2']",
    );
    expect(memberButton).toBeInTheDocument();

    await act(async () => {
      memberButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(
      container.querySelector("[data-testid='about-photographers-member-showcase-empty']"),
    ).toBeInTheDocument();
    expect(container.textContent).toContain("등록된 대표 작품 사진이 없습니다.");
  });
});
