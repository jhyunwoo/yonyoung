"use client";

import { useEffect, useState, type ReactNode } from "react";
import AdminSidebar from "./admin-sidebar";
import type { AuthSession } from "../../../../lib/auth-shared";

const COLLAPSED_STORAGE_KEY = "admin.sidebar.collapsed";

type AdminShellProps = {
  children: ReactNode;
  session: AuthSession;
};

/**
 * AdminShell 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param { children, session } 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 리렌더링 타이밍에 따라 훅 의존성 배열을 신중히 관리해야 합니다.
 */
export default function AdminShell({ children, session }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(/** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
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

    /**
   * handleToggle의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleToggle = () => {
    setCollapsed(/** setCollapsed 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => {
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
    <div
      className="flex h-screen w-full overflow-hidden bg-[var(--admin-bg-primary)]"
      data-testid="admin-shell"
    >
      <AdminSidebar collapsed={collapsed} onToggle={handleToggle} session={session} />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6" data-testid="admin-shell-content">
          {!isHydrated ? <div className="hidden" data-testid="admin-shell-hydrating" /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
