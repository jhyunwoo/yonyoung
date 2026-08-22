"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ThemeMode } from "@/features/public/theme/theme-mode";

const THEME_MODE_OPTIONS = [
  { mode: "light", label: "라이트 모드", Icon: Sun },
  { mode: "dark", label: "다크 모드", Icon: Moon },
  { mode: "system", label: "기기 설정", Icon: Monitor },
] as const satisfies ReadonlyArray<{
  mode: ThemeMode;
  label: string;
  Icon: typeof Sun;
}>;

type SiteHeaderThemeSwitcherProps = {
  themeMode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
};

export default function SiteHeaderThemeSwitcher({
  themeMode,
  onChange,
}: SiteHeaderThemeSwitcherProps) {
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
            onClick={() => onChange(mode)}
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
