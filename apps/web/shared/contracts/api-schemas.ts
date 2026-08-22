// 기존 import 경로 호환용 facade. 새 코드는 bounded context 모듈을 직접 사용한다.
export { apiRoleSchema } from "@/shared/contracts/api/common";

export {
  apiAuditActionSchema,
  apiAuditActorSchema,
  apiAuditLogSchema,
  apiAuditResourceTypeSchema,
} from "@/shared/contracts/api/audit";

export {
  apiCreateGenerationInputSchema,
  apiGenerationMemberSummarySchema,
  apiGenerationSchema,
  apiPublicGenerationMemberSchema,
  apiPublicGenerationWithMembersSchema,
  apiUpdateGenerationInputSchema,
} from "@/shared/contracts/api/generations";

export {
  apiActivityImageSchema,
  apiActivitySchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiUpdateActivityImageBatchItemInputSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
} from "@/shared/contracts/api/activities";

export {
  apiCreateExhibitionImageInputSchema,
  apiCreateExhibitionInputSchema,
  apiExhibitionImageSchema,
  apiExhibitionSchema,
  apiUpdateExhibitionImageBatchItemInputSchema,
  apiUpdateExhibitionImageInputSchema,
  apiUpdateExhibitionInputSchema,
} from "@/shared/contracts/api/exhibitions";

export {
  apiAttachmentSchema,
  apiAttachmentScopeSchema,
  apiCreateAttachmentInputSchema,
  apiUpdateAttachmentInputSchema,
} from "@/shared/contracts/api/attachments";

export {
  apiCreateLinktreeInputSchema,
  apiCreateLinktreeItemInputSchema,
  apiLinktreeItemSchema,
  apiLinktreeSchema,
  apiUpdateLinktreeInputSchema,
  apiUpdateLinktreeItemInputSchema,
} from "@/shared/contracts/api/linktree";

export {
  apiSiteSettingsSchema,
  apiUpdateSiteSettingsInputSchema,
} from "@/shared/contracts/api/site-settings";

export {
  apiRecruitingPlanSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
} from "@/shared/contracts/api/recruiting";

export {
  apiAdminUpdateUserInputSchema,
  apiBulkUpdateUserRoleInputSchema,
  apiMemberProfileUpdateInputSchema,
  apiUpdateUserInputSchema,
  apiUserSchema,
} from "@/shared/contracts/api/users";

export {
  apiAdminDashboardStatsSchema,
  apiPageViewStatsSchema,
} from "@/shared/contracts/api/dashboard";

export {
  apiPresignRequestSchema,
  apiPresignResponseSchema,
} from "@/shared/contracts/api/uploads";
