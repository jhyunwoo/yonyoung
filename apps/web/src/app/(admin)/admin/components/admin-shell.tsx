"use client";

import { useEffect, useState, type ReactNode } from "react";
import AdminSidebar from "./admin-sidebar";
import type { AuthSession } from "../../../../lib/auth-shared";

const COLLAPSED_STORAGE_KEY = "admin.sidebar.collapsed";

type AdminShellProps = {
  children: ReactNode;
  session: AuthSession;
};

export default function AdminShell({ children, session }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored === "1") {
        setCollapsed(true);
      }
    } catch {
      // localStorage 접근 실패 시 기본값(false) 유지
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const handleToggle = () => {
    setCollapsed((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // 저장 실패 시에도 UI는 동작하도록 한다.
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50" data-testid="admin-shell">
      <AdminSidebar collapsed={collapsed} onToggle={handleToggle} session={session} />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-7xl p-6" data-testid="admin-shell-content">
          {!isHydrated ? <div className="hidden" data-testid="admin-shell-hydrating" /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
