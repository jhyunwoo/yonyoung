import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(() => "/dashboard"),
}));

vi.mock("../../../lib/auth-client-tool", () => ({
  signOut: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
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
    usePathnameMock.mockReturnValue("/dashboard");
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

  it("모바일 사이드바를 열면 애니메이션 상태 속성을 노출하고 닫을 수 있다", async () => {
    const { default: DashboardShell } = await import("./dashboard-shell");

    await act(async () => {
      root.render(
        <DashboardShell generationOptions={[]} viewer={null}>
          <div>content</div>
        </DashboardShell>,
      );
      await Promise.resolve();
    });

    const openButton = container.querySelector("button[aria-label='사이드바 열기']");
    expect(openButton).toBeInTheDocument();

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const mobileSidebar = container.querySelector("[data-testid='dashboard-mobile-sidebar']");
    expect(mobileSidebar).toBeInTheDocument();
    expect(mobileSidebar?.getAttribute("data-state")).toBe("open");

    const closeButton = container.querySelector(
      "[data-testid='dashboard-mobile-sidebar'] button[aria-label='사이드바 닫기']",
    );

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(
      container.querySelector("[data-testid='dashboard-mobile-sidebar']"),
    ).not.toBeInTheDocument();
  });

  it("모바일에서 기수 메인 경로에 있으면 헤더에 기수명을 노출한다", async () => {
    usePathnameMock.mockReturnValue("/dashboard/60%EA%B8%B0");
    const { default: DashboardShell } = await import("./dashboard-shell");

    await act(async () => {
      root.render(
        <DashboardShell
          generationOptions={[
            {
              id: "generation-60",
              name: "60기",
              sortOrder: 60,
              startDate: Date.UTC(2030, 2, 1),
              endDate: Date.UTC(2031, 1, 28),
              updatedAt: Date.UTC(2030, 2, 1),
              updatedBy: null,
              path: "/dashboard/60%EA%B8%B0",
            },
          ]}
          viewer={null}
        >
          <div>content</div>
        </DashboardShell>,
      );
      await Promise.resolve();
    });

    const mobileHeaderTitle = container.querySelector("header p");
    expect(mobileHeaderTitle).toBeInTheDocument();
    expect(mobileHeaderTitle).toHaveTextContent("60기");
    expect(mobileHeaderTitle).not.toHaveTextContent("기수 홈");
  });
});
