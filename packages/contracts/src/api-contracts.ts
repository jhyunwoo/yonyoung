// 기존 import 경로 호환용 facade. 새 코드는 bounded context 모듈을 직접 사용한다.
export { API_ERROR_CODES, IMAGE_BATCH_MAX_ITEMS } from "./api/common";
export type {
  ApiErrorCode,
  ApiErrorEnvelope,
  ApiKnownRole,
  ApiRole,
  DataEnvelope,
} from "./api/common";

export type {
  ApiAuditAction,
  ApiAuditActor,
  ApiAuditLog,
  ApiAuditResourceType,
} from "./api/audit";

export type {
  ApiCreateGenerationInput,
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiPublicGenerationMember,
  ApiPublicGenerationWithMembers,
  ApiReorderGenerationsInput,
  ApiUpdateGenerationInput,
} from "./api/generations";

export type {
  ApiActivity,
  ApiActivityImage,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiListActivitiesQuery,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
} from "./api/activities";

export type {
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiListExhibitionsQuery,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
} from "./api/exhibitions";

export {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ATTACHMENT_ACCEPT,
} from "./api/attachments";
export {
  ALLOWED_IMAGE_CONTENT_TYPES,
  IMAGE_UPLOAD_ACCEPT,
  normalizeUploadContentType,
} from "./api/uploads";
export type {
  ApiAttachment,
  ApiAttachmentScope,
  ApiCreateAttachmentInput,
  ApiUpdateAttachmentInput,
} from "./api/attachments";

export type {
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiLinktree,
  ApiLinktreeItem,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
} from "./api/linktree";

export { DEFAULT_SITE_SETTINGS } from "./api/site-settings";
export type {
  ApiSiteSettings,
  ApiUpdateSiteSettingsInput,
} from "./api/site-settings";

export type {
  ApiRecruitingPlan,
  ApiUpsertCurrentRecruitingPlanInput,
} from "./api/recruiting";

export type {
  ApiAdminUpdateUserInput,
  ApiBulkUpdateUserRoleInput,
  ApiMemberProfileUpdateInput,
  ApiUpdateUserInput,
  ApiUser,
  ApiUserResourceHistory,
  ApiUserResourceHistoryItem,
  ApiUserResourceHistoryResourceType,
} from "./api/users";

export type { ApiAdminDashboardStats, ApiPageViewStats } from "./api/dashboard";

export type {
  ApiMultipartUploadAbortRequest,
  ApiMultipartUploadCompleteRequest,
  ApiMultipartUploadCompleteResponse,
  ApiMultipartUploadInitRequest,
  ApiMultipartUploadInitResponse,
  ApiMultipartUploadedPart,
  ApiMultipartUploadPartRequest,
  ApiMultipartUploadPartResponse,
  ApiPresignRequest,
  ApiPresignResponse,
  ApiUploadSettleRequest,
} from "./api/uploads";
