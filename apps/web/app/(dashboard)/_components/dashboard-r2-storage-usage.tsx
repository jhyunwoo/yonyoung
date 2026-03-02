import { getCachedAdminDashboardStats } from "@/features/dashboard/cache/admin-dashboard-cache";
import { readServerCookieHeader } from "@/features/dashboard/generation/admin-generation-server";
import R2StorageUsageCard from "@/app/(dashboard)/_components/r2-storage-usage-card";

export default async function DashboardR2StorageUsage() {
  const cookieHeader = await readServerCookieHeader();
  const stats = await getCachedAdminDashboardStats(cookieHeader);
  return <R2StorageUsageCard stats={stats} />;
}
