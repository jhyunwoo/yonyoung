"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const setTheme = (theme: Theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
};

/**
 * ThemeToggle 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      setThemeState(stored);
      return;
    }

    const initialTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    setTheme(initialTheme);
    setThemeState(initialTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] transition hover:scale-105 hover:border-[var(--accent)] hover:text-[var(--accent)]"
      aria-label="테마 변경"
      data-testid="theme-toggle"
    >
      <span className="text-lg leading-none" data-testid="theme-toggle-icon">
        {theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
