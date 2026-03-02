import type { ApiAuditActor, ApiAuditLog } from "@/shared/contracts/api-contracts";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";

export const formatAuditActor = (actor: ApiAuditActor | null): string => {
  if (!actor) {
    return "알 수 없음";
  }

  const roleLabel = actor.role ? buildMemberRoleLabel(actor.role) : "역할 미지정";
  return `${actor.name} (${roleLabel})`;
};

export const formatAuditActionLabel = (action: ApiAuditLog["action"]): string => {
  switch (action) {
    case "create":
      return "생성";
    case "update":
      return "수정";
    case "delete":
      return "삭제";
    default:
      return action;
  }
};
