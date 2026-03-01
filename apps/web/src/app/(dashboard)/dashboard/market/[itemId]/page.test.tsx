import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const getCurrentUserProfileMock = vi.fn();
const buildDashboardViewerProfileMock = vi.fn();

vi.mock("../../../../../lib/auth-server-tool", () => ({
  serverAuthTool: {
    requireSession: requireSessionMock,
    getCurrentUserProfile: getCurrentUserProfileMock,
  },
}));

vi.mock("../../../../../lib/user-profile", () => ({
  buildDashboardViewerProfile: (...args: unknown[]) =>
    buildDashboardViewerProfileMock(...args),
}));

vi.mock("./market-item-detail-page-client", () => ({
  default: ({
    viewer,
    itemId,
  }: {
    viewer: { id: string; displayName: string; role: string | null };
    itemId: string;
  }) => (
    <section data-testid="market-item-detail-page-client">
      {viewer.id}/{viewer.displayName}/{viewer.role}/{itemId}
    </section>
  ),
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("DashboardMarketItemDetailPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    requireSessionMock.mockReset();
    getCurrentUserProfileMock.mockReset();
    buildDashboardViewerProfileMock.mockReset();

    requireSessionMock.mockResolvedValue({
      user: {
        id: "member-1",
        role: "regular_member",
      },
    });
    getCurrentUserProfileMock.mockResolvedValue({
      familyName: "홍",
      givenName: "길동",
    });
    buildDashboardViewerProfileMock.mockReturnValue({
      id: "member-1",
      displayName: "홍길동",
      role: "regular_member",
    });

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

  it("viewer와 itemId를 상세 클라이언트에 전달한다", async () => {
    const { default: DashboardMarketItemDetailPage } = await import("./page");
    const tree = await DashboardMarketItemDetailPage({
      params: Promise.resolve({ itemId: "market-item-1" }),
    });

    await act(async () => {
      root.render(tree);
      await Promise.resolve();
    });

    expect(requireSessionMock).toHaveBeenCalledTimes(1);
    expect(getCurrentUserProfileMock).toHaveBeenCalledTimes(1);
    expect(buildDashboardViewerProfileMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("member-1/홍길동/regular_member/market-item-1");
  });
});
