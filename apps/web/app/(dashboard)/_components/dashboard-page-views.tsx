import { getCachedPageViewStats } from "@/features/dashboard/cache/admin-dashboard-cache";
import { readCookieHeader } from "@/shared/http/http";
import DashboardPageViewsCard from "@/app/(dashboard)/_components/dashboard-page-views-client";

export default async function DashboardPageViews() {
  const cookieHeader = await readCookieHeader();
  const { data: stats, error } = await getCachedPageViewStats(cookieHeader);
  return <DashboardPageViewsCard initialStats={stats} initialError={error} />;
}
