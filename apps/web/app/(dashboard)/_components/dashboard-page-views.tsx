import { getAdminPageViewStats } from "@/features/dashboard/services/admin-read-service";
import DashboardPageViewsCard from "@/app/(dashboard)/_components/dashboard-page-views-client";

export default async function DashboardPageViews() {
  const result = await getAdminPageViewStats();
  const stats = result.ok ? result.data : null;
  const error = result.ok ? null : result.error.message;
  return <DashboardPageViewsCard initialStats={stats} initialError={error} />;
}
