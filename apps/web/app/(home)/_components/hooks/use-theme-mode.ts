"use client";

import { useEffect, useState } from "react";
import {
  applyThemeToDocument,
  readResolvedThemeFromDataset,
  readStoredThemeMode,
  readSystemPrefersDark,
  resolveTheme,
  storeThemeMode,
  type ThemeMode,
} from "@/features/public/theme/theme-mode";

/**
 * 테마 모드 상태와 `<html>` 동기화를 담당한다.
 *
 * 서버 렌더 시점에는 저장된 값을 알 수 없으므로 "system"으로 시작하고, 마운트 후
 * 실제 값으로 맞춘다. 깜빡임은 `public/theme-init.js`가 hydration 전에 같은 값을
 * 적용해 두는 것으로 막는다 — 그래서 여기서는 dataset에 이미 확정된 테마가 있으면
 * 그것을 우선한다.
 */
export const useThemeMode = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isSystemDark, setIsSystemDark] = useState(false);

  useEffect(() => {
    // localStorage와 matchMedia, theme-init이 써 둔 <html> dataset 은 모두
    // 서버에서 볼 수 없는 외부 시스템이다. 마운트 후 한 번 읽어 React 상태와 맞춘다.
    const initialMode = readStoredThemeMode();
    const datasetTheme = readResolvedThemeFromDataset();
    const systemDark = readSystemPrefersDark();

    /* eslint-disable react-hooks/set-state-in-effect -- 외부 시스템(DOM/스토리지)에서 초기값을 읽어 오는 동기화다. */
    setThemeMode(initialMode);
    setIsSystemDark(systemDark);
    /* eslint-enable react-hooks/set-state-in-effect */

    applyThemeToDocument({
      resolvedTheme: datasetTheme ?? resolveTheme(initialMode, systemDark),
      mode: initialMode,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      setIsSystemDark(mediaQuery.matches);
      if (themeMode !== "system") {
        return;
      }
      applyThemeToDocument({
        resolvedTheme: resolveTheme("system", mediaQuery.matches),
      });
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", onSystemThemeChange);
    }

    // Safari 13 이하는 addEventListener를 지원하지 않는다.
    mediaQuery.addListener(onSystemThemeChange);
    return () => mediaQuery.removeListener(onSystemThemeChange);
  }, [themeMode]);

  const changeThemeMode = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    applyThemeToDocument({
      resolvedTheme: resolveTheme(nextMode, readSystemPrefersDark()),
      mode: nextMode,
    });
    storeThemeMode(nextMode);
  };

  return {
    themeMode,
    resolvedTheme: resolveTheme(themeMode, isSystemDark),
    changeThemeMode,
  };
};
