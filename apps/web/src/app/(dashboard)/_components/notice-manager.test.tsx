import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatKoreanDate } from "../../../lib/date-formatters";

const listCachedGenerationNotices = vi.fn();
const listCachedGlobalNotices = vi.fn();
const readServerCookieHeader = vi.fn();

vi.mock("../../../lib/admin-dashboard-cache", () => ({
  listCachedGenerationNotices: (...args: unknown[]) => listCachedGenerationNotices(...args),
  listCachedGlobalNotices: (...args: unknown[]) => listCachedGlobalNotices(...args),
}));

vi.mock("../../../lib/admin-generation-server", () => ({
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

const createGlobalNotice = (id: string, createdAt: number) => ({
  id,
  title: `공지 ${id}`,
  content: `<p>${id} 본문</p>`,
  imageUrls: [],
  createdAt,
  updatedAt: createdAt,
  updatedBy: null,
  author: {
    id: "author-1",
    name: "작성자",
    image: null,
    role: "president",
  },
});

describe("NoticeManager", () => {
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

  it("개수 제한이 주어지면 최신 공지부터 해당 개수만 노출한다", async () => {
    listCachedGlobalNotices.mockResolvedValue([
      createGlobalNotice("notice-1", 1_000),
      createGlobalNotice("notice-7", 7_000),
      createGlobalNotice("notice-3", 3_000),
      createGlobalNotice("notice-6", 6_000),
      createGlobalNotice("notice-2", 2_000),
      createGlobalNotice("notice-5", 5_000),
      createGlobalNotice("notice-4", 4_000),
    ]);

    const { default: NoticeManager } = await import("./notice-manager");
    const tree = await NoticeManager({
      scope: "global",
      canWrite: false,
      heading: "전체 공지",
      description: "설명",
      emptyMessage: "없음",
      basePath: "/dashboard/settings/notices",
      createPath: "/dashboard/settings/notices/new",
      maxItems: 5,
    });

    await act(async () => {
      root.render(tree);
    });

    expect(readServerCookieHeader).toHaveBeenCalledTimes(1);
    expect(listCachedGlobalNotices).toHaveBeenCalledWith("session=abc");
    expect(container.querySelectorAll("li")).toHaveLength(5);
    expect(
      container.querySelector("a[href='/dashboard/settings/notices/notice-7']"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("a[href='/dashboard/settings/notices/notice-1']"),
    ).not.toBeInTheDocument();
  });

  it("개수 제한이 없으면 전체 공지를 모두 노출한다", async () => {
    listCachedGlobalNotices.mockResolvedValue([
      createGlobalNotice("notice-1", 1_000),
      createGlobalNotice("notice-2", 2_000),
      createGlobalNotice("notice-3", 3_000),
    ]);

    const { default: NoticeManager } = await import("./notice-manager");
    const tree = await NoticeManager({
      scope: "global",
      canWrite: false,
      heading: "전체 공지",
      description: "설명",
      emptyMessage: "없음",
      basePath: "/dashboard/settings/notices",
      createPath: "/dashboard/settings/notices/new",
    });

    await act(async () => {
      root.render(tree);
    });

    expect(readServerCookieHeader).toHaveBeenCalledTimes(1);
    expect(listCachedGlobalNotices).toHaveBeenCalledWith("session=abc");
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  it("공지 목록에서는 제목과 작성일만 노출한다", async () => {
    const createdAt = Date.UTC(2025, 0, 8);
    listCachedGlobalNotices.mockResolvedValue([createGlobalNotice("notice-1", createdAt)]);

    const { default: NoticeManager } = await import("./notice-manager");
    const tree = await NoticeManager({
      scope: "global",
      canWrite: false,
      heading: "전체 공지",
      description: "설명",
      emptyMessage: "없음",
      basePath: "/dashboard/settings/notices",
      createPath: "/dashboard/settings/notices/new",
    });

    await act(async () => {
      root.render(tree);
    });

    expect(container.textContent).toContain("공지 notice-1");
    expect(container.textContent).toContain(`작성일: ${formatKoreanDate(createdAt)}`);
    expect(container.textContent).not.toContain("notice-1 본문");
    expect(container.textContent).not.toContain("최근 수정자:");
    expect(container.textContent).not.toContain("첨부 이미지");
    expect(container.textContent).not.toContain("작성자:");
  });
});
