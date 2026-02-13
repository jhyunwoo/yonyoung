"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const icon = mounted ? (resolvedTheme === "dark" ? "☀" : "☾") : "☾";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      disabled={!mounted}
      onClick={() => setTheme(nextTheme)}
      aria-label="테마 전환"
      title="라이트/다크 전환"
    >
      {icon}
    </button>
  );
}
