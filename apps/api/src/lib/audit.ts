import { captureException } from "@sentry/cloudflare";
import { logger } from "../shared/logging/logger";
import type { Actor } from "./authorization/types";
import type { AuditAction, AuditResourceType, DataService } from "./services/types";

const toAuditActor = (actor: Actor) => ({
  id: actor.id,
  name: actor.name,
  familyName: actor.familyName,
  givenName: actor.givenName,
  role: actor.rawRole ?? actor.role ?? null,
});

export const withUpdatedByActor = <T extends { updatedBy: unknown }>(
  entity: T,
  actor: Actor,
): T => {
  return {
    ...entity,
    updatedBy: toAuditActor(actor),
  };
};

export const readChangedFields = (
  input: Record<string, unknown>,
  fallback: string[],
): string[] => {
  const fields = Object.keys(input).filter((field) => field.trim().length > 0);
  if (fields.length > 0) {
    return fields.sort();
  }

  return fallback;
};

/**
 * 감사 로그를 남긴다. 호출 시점에는 본 쓰기가 이미 커밋되어 있으므로, 여기서 실패를
 * 그대로 던지면 클라이언트는 500을 받고 성공한 쓰기를 재시도해 중복 데이터를 만든다.
 * 감사 기록 실패는 오류 로그·Sentry로 남기고 응답은 성공으로 유지한다.
 */
export const recordAuditLog = async (input: {
  dataService: DataService;
  actor: Actor;
  resourceType: AuditResourceType;
  resourceId: string;
  action: AuditAction;
  changedFields: string[];
}): Promise<void> => {
  try {
    await input.dataService.createAuditLog({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: input.actor.rawRole ?? input.actor.role ?? null,
      changedFields: input.changedFields,
    });
  } catch (error) {
    logger.error({
      event: "audit_log.write_failed",
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      actorId: input.actor.id,
      error: error instanceof Error ? error.message : String(error),
    });
    captureException(error, {
      tags: { event: "audit_log.write_failed" },
    });
  }
};
