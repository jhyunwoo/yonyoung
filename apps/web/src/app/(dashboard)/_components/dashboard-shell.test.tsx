import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/auth-client-tool", () => ({
  signOut: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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

vi.mock("next/image", () => ({
  default: ({
    unoptimized,
    ...rest
  }: {
    unoptimized?: boolean;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-unoptimized={String(Boolean(unoptimized))} {...rest} />
  ),
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
    useReducedMotion: () => true,
  };
});

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("DashboardShell", () => {
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

  it("사이드바 로고 이미지는 Next 이미지 최적화를 우회한다", async () => {
    const { default: DashboardShell } = await import("./dashboard-shell");

    await act(async () => {
      root.render(
        <DashboardShell generationOptions={[]} viewer={null}>
          <div>content</div>
        </DashboardShell>,
      );
      await Promise.resolve();
    });

    const logoImage = container.querySelector("img[alt='연영회 로고']");

    expect(logoImage).toBeInTheDocument();
    expect(logoImage?.getAttribute("data-unoptimized")).toBe("true");
  });

  it("회장이면 설정 하위 메뉴에 전체 기수 관리를 노출한다", async () => {
    const { default: DashboardShell } = await import("./dashboard-shell");

    await act(async () => {
      root.render(
        <DashboardShell
          generationOptions={[]}
          viewer={{
            id: "user-president",
            displayName: "회장",
            email: "president@example.com",
            image: null,
            role: "president",
          }}
        >
          <div>content</div>
        </DashboardShell>,
      );
      await Promise.resolve();
    });

    const settingsButton = Array.from(
      container.querySelectorAll("button[aria-expanded]"),
    ).find((button) => button.textContent?.includes("설정"));
    expect(settingsButton).toBeInTheDocument();

    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("전체 기수 관리");
  });

  it("회장이 아니면 설정 하위 메뉴에서 전체 기수 관리를 숨긴다", async () => {
    const { default: DashboardShell } = await import("./dashboard-shell");

    await act(async () => {
      root.render(
        <DashboardShell
          generationOptions={[]}
          viewer={{
            id: "user-manager",
            displayName: "부장",
            email: "manager@example.com",
            image: null,
            role: "manager",
          }}
        >
          <div>content</div>
        </DashboardShell>,
      );
      await Promise.resolve();
    });

    const settingsButton = Array.from(
      container.querySelectorAll("button[aria-expanded]"),
    ).find((button) => button.textContent?.includes("설정"));
    expect(settingsButton).toBeInTheDocument();

    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("전체 멤버 관리");
    expect(container.textContent).not.toContain("전체 기수 관리");
  });
});
