import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import { getAdminPageViewStats } from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import StatsView from "./stats-view";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";

export const metadata = {
  title: "방문 통계 | 연영회 관리자",
};

export default async function StatsPage() {
  await serverAuthGuard.requireSession();
  const cookieHeader = await readCookieHeader();
  const result = await getAdminPageViewStats(cookieHeader);
  const stats = result.ok ? result.data : null;
  const error = result.ok ? null : result.error.message;

  return (
    <PageContainer>
      <StatsView stats={stats} error={error} />
    </PageContainer>
  );
}
