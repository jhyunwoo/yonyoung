import type { ApiAuditActor } from "@/features/dashboard/api/admin-api/types";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";

type LastUpdatedMetaProps = {
  updatedAt: number;
  updatedBy: ApiAuditActor | null;
  className?: string;
};

export default function LastUpdatedMeta({
  updatedAt,
  updatedBy,
  className,
}: LastUpdatedMetaProps) {
  return (
    <p className={className ?? "text-xs text-slate-500"}>
      최근 수정: {formatKoreanDate(updatedAt)} · {formatAuditActor(updatedBy)}
    </p>
  );
}
