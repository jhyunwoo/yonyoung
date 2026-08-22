"use client";

import Image from "next/image";
import Link from "next/link";

import { SidebarFooter } from "@/app/(dashboard)/_components/shell/sidebar-footer";
import { SidebarNav } from "@/app/(dashboard)/_components/shell/sidebar-nav";
import type { DashboardViewer } from "@/app/(dashboard)/_components/shell/dashboard-shell-types";
import type { NavigationItem } from "@/app/(dashboard)/_components/shell/dashboard-navigation";
import { Badge } from "@/app/(dashboard)/_components/ui/badge";
import type { DashboardGenerationOption } from "@/features/dashboard/generation/generation-options";
import type { DashboardSettingsMenuItem } from "@/features/dashboard/settings/dashboard-settings-menu";

type SidebarContentProps = {
  pathname: string;
  navigationItems: NavigationItem[];
  settingsItems: DashboardSettingsMenuItem[];
  isSettingsSectionActive: boolean;
  hasGenerationOptions: boolean;
  selectedGeneration: DashboardGenerationOption | null;
  viewer: DashboardViewer | null;
  onNavigate: () => void;
  onSignOut: () => Promise<void>;
  isSignOutPending: boolean;
};

/** 데스크탑 사이드바와 모바일 드로어가 공유하는 내부 구성. */
export const SidebarContent = ({
  pathname,
  navigationItems,
  settingsItems,
  isSettingsSectionActive,
  hasGenerationOptions,
  selectedGeneration,
  viewer,
  onNavigate,
  onSignOut,
  isSignOutPending,
}: SidebarContentProps) => (
  <div className="flex h-full min-h-0 flex-col bg-surface">
    <div className="border-b border-hairline px-4 py-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-surface">
          <Image
            src="/yonyoung-logo-black.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain dark:invert"
          />
        </span>
        <span className="min-w-0">
          <span className="block text-body font-bold text-ink">연영회 대시보드</span>
          {selectedGeneration !== null && (
            <span className="mt-1 block">
              <Badge tone="primary">{selectedGeneration.name}</Badge>
            </span>
          )}
        </span>
      </Link>

      {selectedGeneration === null && !hasGenerationOptions && (
        <p className="mt-3 text-caption text-ink-muted">
          아직 소속된 기수가 없습니다. 관리자에게 기수 배정을 요청하세요.
        </p>
      )}
    </div>

    <SidebarNav
      items={navigationItems}
      settingsItems={settingsItems}
      pathname={pathname}
      isSettingsSectionActive={isSettingsSectionActive}
      onNavigate={onNavigate}
    />

    <SidebarFooter
      viewer={viewer}
      pathname={pathname}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      isSignOutPending={isSignOutPending}
    />
  </div>
);
