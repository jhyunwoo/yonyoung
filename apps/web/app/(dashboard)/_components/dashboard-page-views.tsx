import { getAdminPageViewStats } from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import DashboardPageViewsCard from "@/app/(dashboard)/_components/dashboard-page-views-client";

export default async function DashboardPageViews() {
  const cookieHeader = await readCookieHeader();
  const result = await getAdminPageViewStats(cookieHeader);
  const stats = result.ok ? result.data : null;
  const error = result.ok ? null : result.error.message;
  return <DashboardPageViewsCard initialStats={stats} initialError={error} />;
}
