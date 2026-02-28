import { getCachedAdminDashboardStats } from "../../../lib/admin-dashboard-cache";
import { readServerCookieHeader } from "../../../lib/admin-generation-server";
import R2StorageUsageCard from "./r2-storage-usage-card";

export default async function DashboardR2StorageUsage() {
  const cookieHeader = await readServerCookieHeader();
  const stats = await getCachedAdminDashboardStats(cookieHeader);
  return <R2StorageUsageCard stats={stats} />;
}
