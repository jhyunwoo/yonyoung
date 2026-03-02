import type { ApiAdminDashboardStats } from "@/features/dashboard/api/admin-api/types";

const DEFAULT_R2_STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${Number(value.toFixed(digits))} ${units[unitIndex]}`;
};

type R2StorageUsageCardProps = {
  stats: ApiAdminDashboardStats | null;
};

export default function R2StorageUsageCard({ stats }: R2StorageUsageCardProps) {
  const limitBytes =
    stats && stats.r2StorageLimitBytes > 0
      ? stats.r2StorageLimitBytes
      : DEFAULT_R2_STORAGE_LIMIT_BYTES;
  const usedBytes = stats?.r2StorageUsedBytes ?? 0;
  const isAvailable = stats?.r2StorageUsageAvailable ?? false;
  const usagePercent = clamp((usedBytes / limitBytes) * 100, 0, 100);
  const remainingBytes = Math.max(limitBytes - usedBytes, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">파일 저장공간 사용량</h2>
        <span className="text-xs font-semibold text-slate-500">한도 {formatBytes(limitBytes)}</span>
      </div>

      {isAvailable ? (
        <>
          <p className="mt-4 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{formatBytes(usedBytes)}</span>
            {" / "}
            {formatBytes(limitBytes)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            사용률 {usagePercent.toFixed(1)}% · 남은 용량 {formatBytes(remainingBytes)}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              data-testid="r2-usage-meter"
              className="h-full rounded-full bg-slate-900"
              style={{ width: `${usagePercent}%` }}
              aria-hidden="true"
            />
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          저장공간 사용량을 불러오지 못했습니다.
        </p>
      )}
    </section>
  );
}
