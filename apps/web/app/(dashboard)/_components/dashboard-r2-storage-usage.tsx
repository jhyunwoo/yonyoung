import { getAdminDashboardStats } from "@/features/dashboard/services/admin-read-service";
import { readCookieHeader } from "@/shared/http/http";
import R2StorageUsageCard from "@/app/(dashboard)/_components/r2-storage-usage-card";

export default async function DashboardR2StorageUsage() {
  const cookieHeader = await readCookieHeader();
  const result = await getAdminDashboardStats(cookieHeader);
  return <R2StorageUsageCard stats={result.ok ? result.data : null} />;
}
