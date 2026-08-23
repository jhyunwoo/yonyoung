import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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

    // 퇴장 애니메이션이 CSS 전환으로 바뀌었으므로 닫기는 비동기다. framer-motion 을
    // 쓰던 시절에도 exit 애니메이션은 있었고, 테스트가 동기였던 것은 목이
    // AnimatePresence 를 그냥 통과시켰기 때문이다.
    await user.click(screen.getByTestId("public-nav-mobile-backdrop"));
    await waitFor(() =>
      expect(screen.queryByTestId("public-nav-mobile")).not.toBeInTheDocument(),
    );
  });

  it("renders the header frame as static markup (no theme JS needed for the logo)", () => {
    render(<SiteHeader />);

    // 로고는 CSS 배경으로 그린다 — 라이트/다크 두 파일 중 매칭된 것만 받게 하려는
    // 의도라, <img> 로 되돌아가면 감춰진 쪽까지 내려받는 회귀가 생긴다.
    const logo = screen.getByTestId("public-logo-image");
    expect(logo.tagName).toBe("DIV");
    expect(logo).toHaveAttribute("role", "img");
    expect(logo).toHaveAttribute("aria-label", "연영회 로고");
    expect(screen.getByTestId("public-header")).toBeInTheDocument();
  });
});
