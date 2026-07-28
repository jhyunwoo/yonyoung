"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  buildNavigationItems,
  isSettingsSectionPath,
  resolveActiveGenerationFromPath,
  resolveActivePageName,
  resolveSelectedGenerationScopedPath,
} from "@/app/(dashboard)/_components/shell/dashboard-navigation";
import { MobileDrawer } from "@/app/(dashboard)/_components/shell/mobile-drawer";
import { SidebarContent } from "@/app/(dashboard)/_components/shell/sidebar-content";
import { ConfirmProvider } from "@/app/(dashboard)/_components/ui/confirm-provider";
import { IconButton } from "@/app/(dashboard)/_components/ui/icon-button";
import { SkipLink } from "@/app/(dashboard)/_components/ui/layout-parts";
import { ToastProvider } from "@/app/(dashboard)/_components/ui/toast-provider";
import { signOut } from "@/features/auth/client/auth-actions";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";
import type { DashboardGenerationOption } from "@/features/dashboard/generation/generation-options";
import { buildDashboardSettingsMenuItems } from "@/features/dashboard/settings/dashboard-settings-menu";
import { isMemberLikeRoleValue } from "@/shared/contracts/auth-roles";

export type { DashboardViewer } from "@/app/(dashboard)/_components/shell/dashboard-shell-types";

import type { DashboardViewer } from "@/app/(dashboard)/_components/shell/dashboard-shell-types";

const MAIN_CONTENT_ID = "dashboard-main";

type DashboardShellProps = {
  children: ReactNode;
  generationOptions: DashboardGenerationOption[];
  viewer: DashboardViewer | null;
};

/**
 * 대시보드 셸.
 *
 * 구조: 데스크탑 고정 사이드바 + 모바일 상단 바 / 오프캔버스 드로어.
 * 바텀 내비게이션은 쓰지 않는다 — 이 앱의 정보 구조는 최상위 탭 3~5개가
 * 아니라 기수 → 활동/전시 → 상세로 이어지는 깊은 계층이다.
 *
 * <main> 은 이 컴포넌트가 단독으로 소유한다. 재디자인 이전에는 셸과 각 페이지가
 * 모두 <main> 을 렌더해 랜드마크가 중첩돼 있었다(페이지는 PageContainer 를 쓴다).
 */
export default function DashboardShell({
  children,
  generationOptions,
  viewer,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSignOutPending, setIsSignOutPending] = useState(false);

  const selectedGeneration = useMemo(
    () => resolveActiveGenerationFromPath(pathname, generationOptions),
    [pathname, generationOptions],
  );
  const selectedGenerationScopedPath = useMemo(
    () => resolveSelectedGenerationScopedPath(pathname),
    [pathname],
  );

  const navigationItems = useMemo(
    () =>
      buildNavigationItems({
        pathname,
        generationOptions,
        selectedGeneration,
        selectedGenerationScopedPath,
      }),
    [pathname, generationOptions, selectedGeneration, selectedGenerationScopedPath],
  );

  const settingsItems = useMemo(
    () =>
      buildDashboardSettingsMenuItems({
        canManagePrivilegedSettings: isPresidentOrVicePresidentRole(viewer?.role),
        isMemberLikeRole: isMemberLikeRoleValue(viewer?.role),
      }),
    [viewer?.role],
  );

  const activePageName = useMemo(
    () =>
      resolveActivePageName({
        pathname,
        selectedGeneration,
        selectedGenerationScopedPath,
      }),
    [pathname, selectedGeneration, selectedGenerationScopedPath],
  );

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async (): Promise<void> => {
    if (isSignOutPending) {
      return;
    }

    setIsSignOutPending(true);
    const result = await signOut();
    setIsSignOutPending(false);

    if (result.ok) {
      window.location.href = "/auth/sign-in";
    }
  };

  // /auth/* 는 셸 없이 자체 레이아웃을 쓴다. 프로바이더도 필요 없다.
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  const sidebar = (onNavigate: () => void) => (
    <SidebarContent
      pathname={pathname}
      navigationItems={navigationItems}
      settingsItems={settingsItems}
      isSettingsSectionActive={isSettingsSectionPath(pathname)}
      hasGenerationOptions={generationOptions.length > 0}
      selectedGeneration={selectedGeneration}
      viewer={viewer}
      onNavigate={onNavigate}
      onSignOut={handleSignOut}
      isSignOutPending={isSignOutPending}
    />
  );

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-dvh bg-canvas text-ink">
          <SkipLink targetId={MAIN_CONTENT_ID} />

          {/* md–lg 는 좁은 레일, lg 이상은 전체 폭 */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-(--sidebar-width-md) border-r border-hairline md:block lg:w-(--sidebar-width)">
            {sidebar(() => {})}
          </aside>

          <div className="md:pl-(--sidebar-width-md) lg:pl-(--sidebar-width)">
            <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline bg-surface/95 px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur md:hidden">
              <p className="min-w-0 truncate text-body-sm font-semibold text-ink">
                {activePageName}
              </p>
              <IconButton
                data-testid="dashboard-mobile-sidebar-open"
                label="사이드바 열기"
                icon={<Menu className="h-4 w-4" />}
                variant="utility"
                onClick={() => setIsMobileOpen(true)}
              />
            </header>

            <main id={MAIN_CONTENT_ID} tabIndex={-1} className="focus:outline-none">
              {children}
            </main>
          </div>

          <MobileDrawer open={isMobileOpen} onClose={() => setIsMobileOpen(false)}>
            {sidebar(() => setIsMobileOpen(false))}
          </MobileDrawer>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
