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
  const stats = await getCachedPageViewStats(cookieHeader);

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <StatsView stats={stats} />
      </div>
    </main>
  );
}
