import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatKoreanDate } from "../../../../lib/date-formatters";

const listCachedGenerationNotices = vi.fn();
const listCachedGlobalNotices = vi.fn();
const readServerCookieHeader = vi.fn();

vi.mock("../../../../lib/admin-dashboard-cache", () => ({
  listCachedGenerationNotices: (...args: unknown[]) => listCachedGenerationNotices(...args),
  listCachedGlobalNotices: (...args: unknown[]) => listCachedGlobalNotices(...args),
}));

vi.mock("../../../../lib/admin-generation-server", () => ({
  readServerCookieHeader: (...args: unknown[]) => readServerCookieHeader(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

const buildNotice = (id: string, createdAt: number) => ({
  id,
  title: `${id} 제목`,
  content: `<p>${id} 본문</p>`,
  imageUrls: ["https://example.com/image-1.png"],
  createdAt,
  updatedAt: createdAt + 1_000,
  updatedBy: {
    id: "editor-1",
    name: "수정자",
    role: "president",
    image: null,
  },
  author: {
    id: "author-1",
    name: "작성자",
    role: "president",
    image: null,
  },
});

describe("GenerationNoticeOverview", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    listCachedGenerationNotices.mockReset();
    listCachedGlobalNotices.mockReset();
    readServerCookieHeader.mockReset();
    readServerCookieHeader.mockResolvedValue("session=abc");
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

  it("기수 공지와 전체 공지 목록에서는 제목과 작성일만 노출한다", async () => {
    const generationCreatedAt = Date.UTC(2025, 0, 9);
    const globalCreatedAt = Date.UTC(2025, 0, 10);
    listCachedGenerationNotices.mockResolvedValue([buildNotice("기수공지", generationCreatedAt)]);
    listCachedGlobalNotices.mockResolvedValue([buildNotice("전체공지", globalCreatedAt)]);

    const { default: GenerationNoticeOverview } = await import("./generation-notice-overview");
    const tree = await GenerationNoticeOverview({
      generationId: "generation-1",
      generationPath: "/dashboard/generation-1",
    });

    await act(async () => {
      root.render(tree);
    });

    expect(readServerCookieHeader).toHaveBeenCalledTimes(1);
    expect(listCachedGenerationNotices).toHaveBeenCalledWith("generation-1", "session=abc");
    expect(listCachedGlobalNotices).toHaveBeenCalledWith("session=abc");

    expect(container.textContent).toContain("기수공지 제목");
    expect(container.textContent).toContain(formatKoreanDate(generationCreatedAt));
    expect(container.textContent).toContain("전체공지 제목");
    expect(container.textContent).toContain(formatKoreanDate(globalCreatedAt));

    expect(container.textContent).not.toContain("기수공지 본문");
    expect(container.textContent).not.toContain("전체공지 본문");
    expect(container.textContent).not.toContain("작성자");
    expect(container.textContent).not.toContain("최근 수정자");
  });
});
