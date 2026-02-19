"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "theme";

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

const resolveTheme = (mode: ThemeMode): "light" | "dark" => {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyThemeMode = (mode: ThemeMode, persist = true) => {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;

  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
};

/**
 * ThemeToggle 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ThemeToggle() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const initialMode: ThemeMode = isThemeMode(stored) ? stored : "system";
    setThemeMode(initialMode);
    applyThemeMode(initialMode, false);
  }, []);

  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyThemeMode("system", false);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themeMode]);

  const handleThemeModeChange = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    applyThemeMode(nextMode);
  };

  return (
    <div
      className="inline-flex items-center border border-(--surface-border) bg-(--surface-elevated) px-1"
      data-testid="theme-toggle"
    >
      <label className="sr-only" htmlFor="public-theme-mode-select">
        테마 선택
      </label>
      <select
        id="public-theme-mode-select"
        value={themeMode}
        onChange={(event) => handleThemeModeChange(event.target.value as ThemeMode)}
        className="h-9 bg-transparent px-2 text-xs font-medium tracking-[0.04em] text-(--text-primary) outline-none"
        aria-label="테마 선택"
        data-testid="theme-toggle-select"
      >
        <option value="light">라이트</option>
        <option value="dark">다크</option>
        <option value="system">기기</option>
      </select>
    </div>
  );
}
