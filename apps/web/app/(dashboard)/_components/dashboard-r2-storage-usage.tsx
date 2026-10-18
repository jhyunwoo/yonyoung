import { getAdminDashboardStats } from "@/features/dashboard/services/admin-read-service";
import R2StorageUsageCard from "@/app/(dashboard)/_components/r2-storage-usage-card";

export default async function DashboardR2StorageUsage() {
  const result = await getAdminDashboardStats();
  return <R2StorageUsageCard stats={result.ok ? result.data : null} />;
}
