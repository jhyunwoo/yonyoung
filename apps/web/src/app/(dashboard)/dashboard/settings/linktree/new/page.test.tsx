import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();

vi.mock("../../../../../../lib/auth-server-tool", () => ({
  serverAuthTool: {
    requireSession: requireSessionMock,
  },
}));

vi.mock("../../../../_components/linktree-create-form", () => ({
  default: ({ canWrite, listPath }: { canWrite: boolean; listPath: string }) => (
    <section data-testid="linktree-create-form-mock">
      {String(canWrite)}:{listPath}
    </section>
  ),
}));

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("SettingsLinktreeCreatePage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    requireSessionMock.mockReset();
    requireSessionMock.mockResolvedValue({
      user: {
        id: "member-1",
        role: "president",
      },
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

  it("세션 역할로 쓰기 권한을 계산해 생성 폼에 전달한다", async () => {
    const { default: SettingsLinktreeCreatePage } = await import("./page");
    const tree = await SettingsLinktreeCreatePage();

    await act(async () => {
      root.render(tree);
      await Promise.resolve();
    });

    expect(requireSessionMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("true:/dashboard/settings/linktree");
  });
});
