"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "@/features/public/theme/theme-mode";
import { useThemeMode } from "./hooks/use-theme-mode";

const THEME_MODE_OPTIONS = [
  { mode: "light", label: "라이트 모드", Icon: Sun },
  { mode: "dark", label: "다크 모드", Icon: Moon },
  { mode: "system", label: "기기 설정", Icon: Monitor },
] as const satisfies ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  Icon: typeof Sun;
}>;

/**
 * 테마 전환 버튼 묶음 — 테마 상태를 직접 소유하는 자족적인 아일랜드다.
 *
 * 예전에는 부모(SiteHeader)가 `useThemeMode()` 를 호출해 값을 내려 줬다. 그
 * 한 줄 때문에 헤더 전체가 클라이언트 컴포넌트여야 했고, 테마를 바꿀 때마다
 * 로고·내비게이션까지 함께 리렌더됐다. 상태를 실제로 쓰는 이 컴포넌트가 갖고
 * 있으면 리렌더 범위가 버튼 3개로 줄어든다.
 */
export default function SiteHeaderThemeSwitcher() {
  const { themeMode, changeThemeMode } = useThemeMode();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-(--surface-border) bg-(--surface-elevated) p-1"
      role="group"
      aria-label="테마 모드 선택"
      data-testid="public-theme-mode-group"
    >
      {THEME_MODE_OPTIONS.map(({ mode, label, Icon }) => {
        const isActive = themeMode === mode;

        return (
          <button
            key={mode}
            type="button"
            onClick={() => changeThemeMode(mode)}
            aria-label={label}
            aria-pressed={isActive}
            data-testid={`public-theme-mode-${mode}`}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
              isActive
                ? "bg-(--accent) text-(--accent-foreground)"
                : "text-(--text-primary) hover:bg-(--surface-muted)"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
