"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(/** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored === "1") {
        setCollapsed(true);
      } else if (stored === null && window.matchMedia("(max-width: 1023px)").matches) {
        setCollapsed(true);
      }
    } catch {
      // localStorage 접근 실패 시 기본값(false) 유지
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const handleViewportChange = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mediaQuery.matches;
      setIsMobileViewport(matches);
      if (!matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    handleViewportChange();
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

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

  const mobileTitle = useMemo(() => {
    if (pathname === "/admin") {
      return "대시보드";
    }
    if (pathname.startsWith("/admin/generations")) {
      return "기수 설정";
    }
    if (pathname.startsWith("/admin/users")) {
      return "사용자 관리";
    }
    if (pathname.startsWith("/admin/supporters")) {
      return "서포터즈";
    }
    if (pathname.startsWith("/admin/linktree")) {
      return "Linktree";
    }
    if (pathname.startsWith("/admin/profile")) {
      return "프로필";
    }
    if (pathname.includes("/activities")) {
      return "활동";
    }
    if (pathname.includes("/exhibitions")) {
      return "전시";
    }
    return "관리자";
  }, [pathname]);

  return (
    <div
      className="admin-root flex h-screen w-full overflow-hidden bg-[var(--admin-bg-primary)]"
      data-testid="admin-shell"
    >
      <div className="hidden h-screen lg:flex">
        <AdminSidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          session={session}
          variant="desktop"
        />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileSidebarOpen(false)}
        aria-hidden="true"
        data-testid="admin-sidebar-overlay"
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar
          collapsed={false}
          onToggle={() => setIsMobileSidebarOpen(false)}
          session={session}
          variant="mobile"
        />
      </div>

      <main className="min-w-0 flex-1 overflow-auto">
        <div
          className="mx-auto w-full max-w-[94rem] p-4 md:p-6 xl:p-7"
          data-testid="admin-shell-content"
        >
          <header className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white/80 px-3 py-2.5 shadow-sm lg:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] shadow-sm"
              aria-label="사이드바 열기"
              data-testid="admin-mobile-menu-toggle"
            >
              <Menu className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
            <p className="text-sm font-semibold tracking-[0.08em] text-gray-700">{mobileTitle}</p>
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600">
              {isMobileViewport ? "M" : "D"}
            </span>
          </header>
          {!isHydrated ? <div className="hidden" data-testid="admin-shell-hydrating" /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
