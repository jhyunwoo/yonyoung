// 기존 import 경로 호환용 facade. 새 코드는 bounded context 모듈을 직접 사용한다.
export { apiRoleSchema } from "./api/common";

export {
  apiAuditActionSchema,
  apiAuditActorSchema,
  apiAuditLogSchema,
  apiAuditResourceTypeSchema,
} from "./api/audit";

export {
  apiCreateGenerationInputSchema,
  apiGenerationMemberSummarySchema,
  apiGenerationSchema,
  apiPublicGenerationMemberSchema,
  apiPublicGenerationWithMembersSchema,
  apiReorderGenerationsInputSchema,
  apiUpdateGenerationInputSchema,
} from "./api/generations";

export {
  apiActivityImageSchema,
  apiActivitySchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiUpdateActivityImageBatchItemInputSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
} from "./api/activities";

export {
  apiCreateExhibitionImageInputSchema,
  apiCreateExhibitionInputSchema,
  apiExhibitionImageSchema,
  apiExhibitionSchema,
  apiUpdateExhibitionImageBatchItemInputSchema,
  apiUpdateExhibitionImageInputSchema,
  apiUpdateExhibitionInputSchema,
} from "./api/exhibitions";

export {
  apiAttachmentSchema,
  apiAttachmentScopeSchema,
  apiCreateAttachmentInputSchema,
  apiUpdateAttachmentInputSchema,
} from "./api/attachments";

export {
  apiCreateLinktreeInputSchema,
  apiCreateLinktreeItemInputSchema,
  apiLinktreeItemSchema,
  apiLinktreeSchema,
  apiUpdateLinktreeInputSchema,
  apiUpdateLinktreeItemInputSchema,
} from "./api/linktree";

export {
  apiSiteSettingsSchema,
  apiUpdateSiteSettingsInputSchema,
} from "./api/site-settings";

export {
  apiRecruitingPlanSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
} from "./api/recruiting";

export {
  apiAdminUpdateUserInputSchema,
  apiBulkUpdateUserRoleInputSchema,
  apiMemberProfileUpdateInputSchema,
  apiUpdateUserInputSchema,
  apiUserSchema,
} from "./api/users";

export {
  apiAdminDashboardStatsSchema,
  apiPageViewStatsSchema,
} from "./api/dashboard";

export {
  apiPresignRequestSchema,
  apiPresignResponseSchema,
} from "./api/uploads";
