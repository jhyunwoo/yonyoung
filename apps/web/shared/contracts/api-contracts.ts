// 기존 import 경로 호환용 facade. 새 코드는 bounded context 모듈을 직접 사용한다.
export { API_ERROR_CODES } from "@/shared/contracts/api/common";
export type {
  ApiErrorCode,
  ApiErrorEnvelope,
  ApiKnownRole,
  ApiRole,
  DataEnvelope,
} from "@/shared/contracts/api/common";

export type {
  ApiAuditAction,
  ApiAuditActor,
  ApiAuditLog,
  ApiAuditResourceType,
} from "@/shared/contracts/api/audit";

export type {
  ApiCreateGenerationInput,
  ApiGeneration,
  ApiGenerationMemberSummary,
  ApiPublicGenerationMember,
  ApiPublicGenerationWithMembers,
  ApiUpdateGenerationInput,
} from "@/shared/contracts/api/generations";

export type {
  ApiActivity,
  ApiActivityImage,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiListActivitiesQuery,
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
} from "@/shared/contracts/api/activities";

export type {
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiListExhibitionsQuery,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
} from "@/shared/contracts/api/exhibitions";

export { ATTACHMENT_ACCEPT } from "@/shared/contracts/api/attachments";
export type {
  ApiAttachment,
  ApiAttachmentScope,
  ApiCreateAttachmentInput,
  ApiUpdateAttachmentInput,
} from "@/shared/contracts/api/attachments";

export type {
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiLinktree,
  ApiLinktreeItem,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
} from "@/shared/contracts/api/linktree";

export { DEFAULT_SITE_SETTINGS } from "@/shared/contracts/api/site-settings";
export type {
  ApiSiteSettings,
  ApiUpdateSiteSettingsInput,
} from "@/shared/contracts/api/site-settings";

export type {
  ApiRecruitingPlan,
  ApiUpsertCurrentRecruitingPlanInput,
} from "@/shared/contracts/api/recruiting";

export type {
  ApiAdminUpdateUserInput,
  ApiBulkUpdateUserRoleInput,
  ApiMemberProfileUpdateInput,
  ApiUpdateUserInput,
  ApiUser,
  ApiUserResourceHistory,
  ApiUserResourceHistoryItem,
  ApiUserResourceHistoryResourceType,
} from "@/shared/contracts/api/users";

export type {
  ApiAdminDashboardStats,
  ApiPageViewStats,
} from "@/shared/contracts/api/dashboard";

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
} from "@/shared/contracts/api/uploads";
