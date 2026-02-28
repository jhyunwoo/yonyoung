import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();

vi.mock("../../../lib/auth-server-tool", () => ({
  serverAuthTool: {
    requireSession: requireSessionMock,
  },
}));

vi.mock("../_components/dashboard-r2-storage-usage", () => ({
  default: () => <section data-testid="dashboard-r2-storage-usage">storage</section>,
}));

vi.mock("../_components/recent-global-notices", () => ({
  default: () => <section data-testid="recent-global-notices">notices</section>,
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("DashboardPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    requireSessionMock.mockReset();
    requireSessionMock.mockResolvedValue(null);
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

  it("연영나스 바로가기 버튼을 노출한다", async () => {
    const { default: DashboardPage } = await import("./page");
    const tree = await DashboardPage();

    await act(async () => {
      root.render(tree);
    });

    expect(requireSessionMock).toHaveBeenCalledTimes(1);
    const nasLink = container.querySelector("a[href='https://165.132.176.27:8080']");

    expect(nasLink).toBeInTheDocument();
    expect(nasLink).toHaveTextContent("연영나스 바로가기");
    expect(nasLink?.getAttribute("target")).toBe("_blank");
    expect(nasLink?.getAttribute("rel")).toContain("noreferrer");
  });
});
