import type { McpUploadPurpose } from "@yonyoung/contracts/mcp";
import type { Role } from "../../../lib/authorization/types";
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ALLOWED_IMAGE_CONTENT_TYPES,
  type ManagedUploadResourcePath,
  type ManagedUploadSlot,
} from "../../../lib/storage/presign";
import {
  canCreateOrUpdate,
  isUserProfileUploadAllowed,
} from "../../uploads/upload.policy";

export type UploadPurposeRule = {
  resourcePath: ManagedUploadResourcePath;
  slot: ManagedUploadSlot;
  allowedContentTypes: readonly string[];
  kind: "image" | "file";
  isAllowed: (role: Role) => boolean;
};

/** 기존 presign 라우트(upload.routes.ts)와 같은 경로·슬롯·형식·권한을 쓴다. */
export const UPLOAD_PURPOSE_RULES: Record<McpUploadPurpose, UploadPurposeRule> =
  {
    activity_cover: {
      resourcePath: "activities",
      slot: "cover",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "activity"),
    },
    activity_image: {
      resourcePath: "activities",
      slot: "detail",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "activity"),
    },
    activity_file: {
      resourcePath: "activities",
      slot: "file",
      allowedContentTypes: ALLOWED_ATTACHMENT_CONTENT_TYPES,
      kind: "file",
      isAllowed: (role) => canCreateOrUpdate(role, "activity"),
    },
    exhibition_cover: {
      resourcePath: "exhibitions",
      slot: "cover",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "exhibition"),
    },
    exhibition_image: {
      resourcePath: "exhibitions",
      slot: "detail",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "exhibition"),
    },
    profile_image: {
      resourcePath: "users",
      slot: "profile",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: isUserProfileUploadAllowed,
    },
    recruiting_image: {
      resourcePath: "notices",
      slot: "image",
      allowedContentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
      kind: "image",
      isAllowed: (role) => canCreateOrUpdate(role, "site_setting"),
    },
    site_file: {
      resourcePath: "site",
      slot: "file",
      allowedContentTypes: ALLOWED_ATTACHMENT_CONTENT_TYPES,
      kind: "file",
      isAllowed: (role) => canCreateOrUpdate(role, "site_setting"),
    },
  };
