import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { getCachedPageViewStats } from "@/features/dashboard/cache/admin-dashboard-cache";
import { readCookieHeader } from "@/shared/http/http";
import StatsView from "./stats-view";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";

export const metadata = {
  title: "방문 통계 | 연영회 관리자",
};

export default async function StatsPage() {
  await serverAuthGuard.requireSession();
  const cookieHeader = await readCookieHeader();
  const { data: stats, error } = await getCachedPageViewStats(cookieHeader);

  return (
    <PageContainer>
      <StatsView stats={stats} error={error} />
    </PageContainer>
  );
}
