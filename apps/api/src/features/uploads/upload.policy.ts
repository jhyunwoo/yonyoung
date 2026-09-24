import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";
import {
  can,
  isManagerLikeRole,
  isMemberLikeRole,
} from "../../lib/authorization/policy";
import type { Actor, Resource, Role } from "../../lib/authorization/types";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  parseManagedObjectKey,
  type ManagedUploadResourcePath,
  type ManagedUploadSlot,
} from "../../lib/storage/presign";
import { AppError } from "../../shared/errors/AppError";

export type ManagedResource = Extract<
  Resource,
  "activity" | "exhibition" | "site_setting"
>;
export type UploadResourcePath = ManagedUploadResourcePath;
export type UploadSlot = ManagedUploadSlot;

export const canCreateOrUpdate = (role: Role, resource: Resource) => {
  return can(role, resource, "create") || can(role, resource, "update");
};

export const resourceByPath: Record<UploadResourcePath, Resource | "user"> = {
  activities: "activity",
  exhibitions: "exhibition",
  users: "user",
  // notices 경로는 모집(recruiting) 이미지와 레거시 공지 이미지가 사용한다
  notices: "site_setting",
  site: "site_setting",
};

/**
 * 본인 프로필 사진 업로드 허용 여부.
 * 부장(manager)처럼 사용자 관리 권한은 없지만 인증된 역할도 본인 프로필은 수정할 수 있어야 한다.
 * 미인증(unverified) 사용자만 막는다.
 */
export const isUserProfileUploadAllowed = (role: Role): boolean => {
  return (
    can(role, "user", "update") ||
    isMemberLikeRole(role) ||
    isManagerLikeRole(role)
  );
};

/**
 * 브라우저가 보낸 Content-Type을 표준 이름으로 맞춘다.
 * Windows의 `application/x-zip-compressed` 같은 별칭이 allowlist에서 415로 거절되지 않게 하고,
 * presign 서명과 저장되는 객체의 Content-Type도 표준 이름으로 통일한다.
 */
export const normalizeUploadRequest = <T extends { contentType: string }>(
  body: T,
): T => ({
  ...body,
  contentType: normalizeUploadContentType(body.contentType),
});

export const assertCanCreateOrUpdate = (
  role: Role,
  resource: Resource,
): void => {
  if (!canCreateOrUpdate(role, resource)) {
    throw AppError.forbidden();
  }
};

/** 형식은 415, 크기는 413으로 구분해 응답한다. */
export const assertUploadPayloadAllowed = (
  input: { contentType: string; fileSize: number },
  options: {
    maxFileSizeBytes: number;
    allowedContentTypes?: readonly string[];
  },
): void => {
  const allowedContentTypes =
    options.allowedContentTypes ?? ALLOWED_IMAGE_CONTENT_TYPES;
  if (!allowedContentTypes.includes(input.contentType)) {
    throw AppError.unsupportedMediaType(
      `지원하지 않는 파일 형식입니다. (${allowedContentTypes.join(", ")})`,
    );
  }

  if (input.fileSize > options.maxFileSizeBytes) {
    throw AppError.payloadTooLarge(
      `업로드 최대 크기(${options.maxFileSizeBytes} bytes)를 초과했습니다.`,
    );
  }
};

/**
 * objectKey는 업로더의 actorId를 담고 있다. 멀티파트 후속 요청(파트 URL/완료/중단)은
 * 이 값으로 소유권과 리소스 권한을 함께 확인한다.
 */
export const assertMultipartOwnership = (input: {
  actor: Pick<Actor, "id" | "role">;
  objectKey: string;
}): void => {
  const parsed = parseManagedObjectKey(input.objectKey);
  if (!parsed) {
    throw AppError.badRequest("objectKey 형식이 올바르지 않습니다.");
  }

  if (parsed.actorId !== input.actor.id) {
    throw AppError.forbidden("본인 소유 업로드만 처리할 수 있습니다.");
  }

  const mappedResource = resourceByPath[parsed.resourcePath];
  if (mappedResource === "user") {
    if (!isUserProfileUploadAllowed(input.actor.role)) {
      throw AppError.forbidden();
    }
    return;
  }

  assertCanCreateOrUpdate(input.actor.role, mappedResource);
};
