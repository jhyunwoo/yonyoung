export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

const isResolvedTheme = (value: unknown): value is ResolvedTheme =>
  value === "light" || value === "dark";

export const resolveTheme = (mode: ThemeMode, isSystemDark: boolean): ResolvedTheme => {
  if (mode === "system") {
    return isSystemDark ? "dark" : "light";
  }
  return mode;
};

/**
 * 저장된 테마 모드를 읽는다.
 *
 * `public/theme-init.js`가 hydration 전에 이미 같은 값을 읽어 `<html>`에 적용해
 * 두므로, localStorage를 못 읽는 상황(프라이빗 모드 등)에서는 그 dataset을 믿는다.
 */
export const readStoredThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }

  const datasetMode = document.documentElement.dataset.themeMode;
  return isThemeMode(datasetMode) ? datasetMode : "system";
};

/** theme-init 스크립트가 이미 확정해 둔 테마. 있으면 그대로 따라가 깜빡임을 막는다. */
export const readResolvedThemeFromDataset = (): ResolvedTheme | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const datasetTheme = document.documentElement.dataset.theme;
  return isResolvedTheme(datasetTheme) ? datasetTheme : null;
};

export const readSystemPrefersDark = (): boolean =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

/** `<html>`의 class와 dataset을 실제 테마와 맞춘다. CSS가 이 값들로 색을 고른다. */
export const applyThemeToDocument = (input: {
  resolvedTheme: ResolvedTheme;
  mode?: ThemeMode;
}): void => {
  const root = document.documentElement;
  root.classList.toggle("dark", input.resolvedTheme === "dark");
  root.dataset.theme = input.resolvedTheme;

  if (input.mode) {
    root.dataset.themeMode = input.mode;
  }
};

export const storeThemeMode = (mode: ThemeMode): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
};
