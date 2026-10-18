import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/app/(dashboard)/_components/ui/theme-toggle";

describe("dashboard ThemeToggle", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true } as Partial<MediaQueryList>),
    );
    document.documentElement.dataset.themeMode = "light";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    const root = document.documentElement;
    root.classList.remove("dark");
    delete root.dataset.theme;
    delete root.dataset.themeMode;
    localStorage.clear();
  });

  it("마운트 때 theme-init 이 써 둔 모드를 읽어 선택 상태로 보여 준다", () => {
    render(<ThemeToggle />);

    expect(screen.getByTestId("dashboard-theme-mode-light")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("누르면 theme-init.js 와 같은 방식으로 DOM 과 저장소에 쓴다", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByTestId("dashboard-theme-mode-system"));

    const root = document.documentElement;
    // matchMedia 스텁이 다크를 돌려주므로 system 은 dark 로 풀린다
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.themeMode).toBe("system");
    expect(localStorage.getItem("theme")).toBe("system");
    expect(screen.getByTestId("dashboard-theme-mode-system")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});
