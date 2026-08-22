import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import { isPresidentOrVicePresidentRole } from "@/features/auth/model/auth-shared";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { buildDashboardSettingsMenuItems } from "@/features/dashboard/settings/dashboard-settings-menu";
import { isMemberLikeRoleValue } from "@/shared/contracts/auth-roles";

export default async function SettingsPage() {
  const session = await serverAuthGuard.requireSession();
  const settingsItems = buildDashboardSettingsMenuItems({
    canManagePrivilegedSettings: isPresidentOrVicePresidentRole(session.user.role),
    isMemberLikeRole: isMemberLikeRoleValue(session.user.role),
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="설정"
        title="대시보드 설정"
        description="개인 프로필과 운영에 필요한 설정 항목을 한곳에서 확인하고 이동할 수 있습니다."
      />

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {settingsItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex h-full items-start gap-3 rounded-lg border border-hairline bg-surface p-4 transition-shadow duration-150 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold text-ink">
                  {item.label}
                </span>
                <span className="mt-1 block text-caption text-ink-muted">
                  {item.description}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
