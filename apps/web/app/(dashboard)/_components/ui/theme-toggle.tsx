"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

import { cx } from "@/app/(dashboard)/_components/ui/cx";

type ThemeMode = "light" | "dark" | "system";

const MODES: readonly {
  value: ThemeMode;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { value: "light", label: "라이트 모드", Icon: Sun },
  { value: "dark", label: "다크 모드", Icon: Moon },
  { value: "system", label: "시스템 설정 따르기", Icon: Monitor },
];

const isThemeMode = (value: string | undefined): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

/** public/theme-init.js 와 동일한 방식으로 DOM 과 localStorage 를 갱신한다. */
const applyThemeMode = (mode: ThemeMode): void => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;

  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.dataset.themeMode = mode;

  try {
    window.localStorage.setItem("theme", mode);
  } catch {
    // 프라이빗 모드 등에서 저장이 막혀도 화면 전환은 이미 끝났다.
  }
};

/**
 * 대시보드 테마 토글.
 *
 * **의도적으로 write-only 다.** 마운트 시 DOM 에서 현재 모드를 한 번만 읽고,
 * 이후에는 클릭할 때만 DOM 에 쓴다. React state 에서 DOM 클래스를 되돌리는
 * effect 를 넣으면, e2e 헬퍼(tests/e2e/support/theme-check.ts)가 DOM 을 직접
 * 조작한 뒤 폴링할 때 서로 싸워서 라우트 매트릭스가 타임아웃한다.
 */
export const ThemeToggle = ({ className }: { className?: string }) => {
  const [mode, setMode] = useState<ThemeMode>("system");

  // theme-init 스크립트가 hydration 전에 <html> 에 써 둔 값을 한 번 읽어 온다.
  // 서버에서는 알 수 없는 값이라 마운트 후에만 동기화할 수 있다.
  useEffect(() => {
    const current = document.documentElement.dataset.themeMode;
    if (isThemeMode(current)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM(외부 시스템)에서 초기값을 읽어 오는 동기화다.
      setMode(current);
    }
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="화면 테마"
      className={cx(
        "flex items-center gap-1 rounded-md border border-hairline bg-canvas-soft p-1",
        className,
      )}
    >
      {MODES.map(({ value, label, Icon }) => {
        const isSelected = mode === value;

        return (
          <button
            key={value}
            type="button"
            data-testid={`dashboard-theme-mode-${value}`}
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            title={label}
            onClick={() => {
              setMode(value);
              applyThemeMode(value);
            }}
            className={cx(
              "inline-flex h-9 flex-1 items-center justify-center rounded-sm",
              "transition-colors duration-150 motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
              isSelected
                ? "bg-surface text-ink shadow-soft"
                : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};
