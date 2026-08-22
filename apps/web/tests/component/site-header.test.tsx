import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("framer-motion", () => {
  const motionProxy = new Proxy(
    {},
    {
      get: (_target, tagName: string) => {
        return ({ children, ...props }: Record<string, unknown>) =>
          createElement(tagName, props, children);
      },
    },
  );

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
    motion: motionProxy,
    useReducedMotion: () => true,
  };
});

import SiteHeader from "@/app/(home)/_components/site-header";

describe("SiteHeader", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.dataset.theme = "";
    document.documentElement.dataset.themeMode = "";
  });

  it("toggles theme mode and updates DOM state", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByTestId("public-theme-mode-dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(screen.getByTestId("public-theme-mode-light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  /**
   * 하위 메뉴가 있는 항목의 부모 클릭은 이동이 아니라 열기/닫기다. 이동이 막혔는지는
   * defaultPrevented 로 확인한다 — 막히지 않으면 jsdom 은 조용히 링크를 따라간다.
   */
  it("toggles the desktop dropdown on click instead of navigating", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    const trigger = screen.getByTestId("public-nav-desktop-archive");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    const defaultPrevented: boolean[] = [];
    const record = (event: MouseEvent) => defaultPrevented.push(event.defaultPrevented);
    document.addEventListener("click", record);

    try {
      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      expect(defaultPrevented).toEqual([true, true]);
    } finally {
      document.removeEventListener("click", record);
    }
  });

  it("opens and closes mobile navigation", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    expect(screen.queryByTestId("public-nav-mobile")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("public-nav-toggle"));
    expect(screen.getByTestId("public-nav-mobile")).toBeInTheDocument();

    await user.click(screen.getByTestId("public-nav-mobile-backdrop"));
    expect(screen.queryByTestId("public-nav-mobile")).not.toBeInTheDocument();
  });
});
