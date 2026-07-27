import { HardDrive } from "lucide-react";

import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import type { ApiAdminDashboardStats } from "@/shared/contracts/api-contracts";

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

  // 사용률이 높아지면 게이지 색으로 경고한다. 색만으로 전달하지 않도록
  // 아래 문구에도 남은 용량을 함께 적는다.
  const meterTone =
    usagePercent >= 90 ? "bg-danger" : usagePercent >= 75 ? "bg-warning" : "bg-primary";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="파일 저장공간 사용량"
        actions={
          <span className="text-caption text-ink-muted">
            한도 {formatBytes(limitBytes)}
          </span>
        }
      />

      {isAvailable ? (
        <div className="mt-5 flex flex-1 flex-col">
          <p className="text-h3 text-ink tabular-nums">{formatBytes(usedBytes)}</p>
          <p className="mt-1 text-caption text-ink-muted">
            전체 {formatBytes(limitBytes)} 중 {usagePercent.toFixed(1)}% 사용 · 남은 용량{" "}
            {formatBytes(remainingBytes)}
          </p>

          <div className="mt-auto pt-5">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(usagePercent)}
              aria-label="파일 저장공간 사용률"
              className="h-2 w-full overflow-hidden rounded-full bg-canvas-soft"
            >
              <div
                data-testid="r2-usage-meter"
                className={`h-full rounded-full ${meterTone} transition-all duration-300 motion-reduce:transition-none`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            Icon={HardDrive}
            accent="teal"
            title="사용량을 불러오지 못했습니다"
            description="저장공간 정보를 가져오는 중 문제가 발생했습니다. 잠시 후 새로고침해 주세요."
          />
        </div>
      )}
    </Card>
  );
}
