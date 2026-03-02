import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listCachedLinktrees = vi.fn();
const readServerCookieHeader = vi.fn();

vi.mock("../../../lib/admin-dashboard-cache", () => ({
  listCachedLinktrees: (...args: unknown[]) => listCachedLinktrees(...args),
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

describe("LinktreeManager", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    listCachedLinktrees.mockReset();
    readServerCookieHeader.mockReset();

    listCachedLinktrees.mockResolvedValue([]);
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

  it("쓰기 권한이 있으면 링크 모음 추가 페이지 이동 버튼을 노출한다", async () => {
    const { default: LinktreeManager } = await import("./linktree-manager");
    const tree = await LinktreeManager({
      canWrite: true,
      basePath: "/dashboard/settings/linktree",
    });

    await act(async () => {
      root.render(tree);
    });

    const createLink = container.querySelector("a[href='/dashboard/settings/linktree/new']");
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveTextContent("링크 모음 추가");
  });

  it("쓰기 권한이 없으면 링크 모음 추가 버튼을 숨긴다", async () => {
    const { default: LinktreeManager } = await import("./linktree-manager");
    const tree = await LinktreeManager({
      canWrite: false,
      basePath: "/dashboard/settings/linktree",
    });

    await act(async () => {
      root.render(tree);
    });

    const createLink = container.querySelector("a[href='/dashboard/settings/linktree/new']");
    expect(createLink).not.toBeInTheDocument();
  });
});
