import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatKoreanDate } from "../../../lib/date-formatters";

const listCachedGlobalNotices = vi.fn();
const readServerCookieHeader = vi.fn();

vi.mock("../../../lib/admin-dashboard-cache", () => ({
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
  updatedAt: createdAt + 1000,
  updatedBy: null,
  author: {
    id: "author-1",
    name: `작성자 ${id}`,
    image: null,
    role: "president",
  },
});

describe("RecentGlobalNotices", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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

  it("정렬 후 최신 전체 공지 5개만 노출한다", async () => {
    listCachedGlobalNotices.mockResolvedValue([
      createGlobalNotice("notice-1", 1000),
      createGlobalNotice("notice-7", 7000),
      createGlobalNotice("notice-3", 3000),
      createGlobalNotice("notice-6", 6000),
      createGlobalNotice("notice-2", 2000),
      createGlobalNotice("notice-5", 5000),
      createGlobalNotice("notice-4", 4000),
    ]);

    const { default: RecentGlobalNotices } = await import("./recent-global-notices");
    const tree = await RecentGlobalNotices();

    await act(async () => {
      root.render(tree);
    });

    expect(readServerCookieHeader).toHaveBeenCalledTimes(1);
    expect(listCachedGlobalNotices).toHaveBeenCalledWith("session=abc");
    expect(container.querySelectorAll("li")).toHaveLength(5);
    expect(container.querySelector("a[href='/dashboard/settings/notices/notice-7']")).toBeInTheDocument();
    expect(container.querySelector("a[href='/dashboard/settings/notices/notice-1']")).not.toBeInTheDocument();
  });

  it("제목, 작성일, 작성자 이름을 노출하고 상세 링크로 이동한다", async () => {
    const createdAt = Date.UTC(2025, 0, 11);
    listCachedGlobalNotices.mockResolvedValue([
      createGlobalNotice("notice-10", createdAt),
    ]);

    const { default: RecentGlobalNotices } = await import("./recent-global-notices");
    const tree = await RecentGlobalNotices();

    await act(async () => {
      root.render(tree);
    });

    expect(container.textContent).toContain("공지 notice-10");
    expect(container.textContent).toContain(
      `작성일: ${formatKoreanDate(createdAt)} · 작성자: 작성자 notice-10`,
    );
    expect(container.textContent).not.toContain("notice-10 본문");
    expect(container.querySelector("a[href='/dashboard/settings/notices/notice-10']")).toBeInTheDocument();
  });

  it("공지 데이터가 없으면 빈 상태 메시지를 노출한다", async () => {
    listCachedGlobalNotices.mockResolvedValue([]);

    const { default: RecentGlobalNotices } = await import("./recent-global-notices");
    const tree = await RecentGlobalNotices();

    await act(async () => {
      root.render(tree);
    });

    expect(container.textContent).toContain("등록된 전체 공지가 없습니다.");
  });
});
