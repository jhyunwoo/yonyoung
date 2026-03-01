import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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
  default: (props: {
    unoptimized?: boolean;
    priority?: boolean;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { unoptimized, ...rest } = props;
    delete (rest as { priority?: boolean }).priority;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img data-unoptimized={String(Boolean(unoptimized))} {...rest} />
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
    useReducedMotion: () => true,
  };
});

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });

describe("SiteHeader", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      writable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
      },
    });
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themeMode;

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

  it("모바일 메뉴를 열면 애니메이션 상태 속성을 노출하고 백드롭 클릭으로 닫힌다", async () => {
    const { default: SiteHeader } = await import("./site-header");

    await act(async () => {
      root.render(<SiteHeader />);
      await Promise.resolve();
    });

    const toggleButton = container.querySelector("button[aria-label='모바일 메뉴 토글']");
    expect(toggleButton).toBeInTheDocument();

    await act(async () => {
      toggleButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const mobileNav = container.querySelector("[data-testid='public-nav-mobile']");
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav?.getAttribute("data-state")).toBe("open");

    const backdrop = container.querySelector("[data-testid='public-nav-mobile-backdrop']");
    expect(backdrop).toBeInTheDocument();

    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.querySelector("[data-testid='public-nav-mobile']")).not.toBeInTheDocument();
  });

  it("Donate US 옆 아이콘 버튼으로 라이트/다크/기기 설정 모드를 전환한다", async () => {
    const { default: SiteHeader } = await import("./site-header");

    await act(async () => {
      root.render(<SiteHeader />);
      await Promise.resolve();
    });

    const lightButton = container.querySelector("[data-testid='public-theme-mode-light']");
    const darkButton = container.querySelector("[data-testid='public-theme-mode-dark']");
    const systemButton = container.querySelector("[data-testid='public-theme-mode-system']");
    expect(lightButton).toBeInTheDocument();
    expect(darkButton).toBeInTheDocument();
    expect(systemButton).toBeInTheDocument();

    await act(async () => {
      darkButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themeMode).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(darkButton).toHaveAttribute("aria-pressed", "true");

    await act(async () => {
      systemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themeMode).toBe("system");
    expect(localStorage.getItem("theme")).toBe("system");
    expect(systemButton).toHaveAttribute("aria-pressed", "true");
  });
});
