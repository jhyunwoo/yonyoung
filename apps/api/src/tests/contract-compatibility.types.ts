/**
 * Compile-time contract drift gate.
 *
 * API response values must be accepted by the runtime-neutral consumer
 * schemas. Conversely, values produced by consumer request schemas must be
 * assignable to the API's stricter request schemas at the TypeScript shape
 * level. API-only validation refinements (UUIDs, limits and OpenAPI metadata)
 * remain in feature contract files and are covered by API runtime tests.
 */
import type { z } from "zod";

import type * as SharedActivities from "@yonyoung/contracts/activities";
import type * as SharedAttachments from "@yonyoung/contracts/attachments";
import type * as SharedAudit from "@yonyoung/contracts/audit";
import type * as SharedDashboard from "@yonyoung/contracts/dashboard";
import type * as SharedExhibitions from "@yonyoung/contracts/exhibitions";
import type * as SharedGenerations from "@yonyoung/contracts/generations";
import type * as SharedLinktree from "@yonyoung/contracts/linktree";
import type * as SharedRecruiting from "@yonyoung/contracts/recruiting";
import type * as SharedSiteSettings from "@yonyoung/contracts/site-settings";
import type * as SharedUploads from "@yonyoung/contracts/uploads";
import type * as SharedUsers from "@yonyoung/contracts/users";
import type * as ApiActivities from "../features/activities/activity.contract";
import type * as ApiAttachments from "../features/attachments/attachment.contract";
import type * as ApiAudit from "../features/audit/audit.contract";
import type * as ApiDashboard from "../features/dashboard/dashboard.contract";
import type * as ApiExhibitions from "../features/exhibitions/exhibition.contract";
import type * as ApiGenerations from "../features/generations/generation.contract";
import type * as ApiLinktree from "../features/linktree/linktree.contract";
import type * as ApiRecruiting from "../features/recruiting-plan/recruiting-plan.contract";
import type * as ApiSiteSettings from "../features/site-settings/site-settings.contract";
import type * as ApiUploads from "../features/uploads/upload.contract";
import type * as ApiUsers from "../features/users/user.contract";

type Output<T extends z.ZodType> = z.output<T>;
type Input<T extends z.ZodType> = z.input<T>;
type IsAssignable<Produced, Consumed> = [Produced] extends [Consumed]
  ? true
  : false;
type Expect<T extends true> = T;
type SharedAttachmentCreate = Output<
  typeof SharedAttachments.apiCreateAttachmentInputSchema
>;
type ApiAttachmentCreate = Input<
  typeof ApiAttachments.ApiCreateAttachmentSchema
>;

export type ResponseContractCompatibility = [
  Expect<
    IsAssignable<
      Output<typeof ApiActivities.ApiActivityImageSchema>,
      Input<typeof SharedActivities.apiActivityImageSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiActivities.ApiActivitySchema>,
      Input<typeof SharedActivities.apiActivitySchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiAttachments.ApiAttachmentSchema>,
      Input<typeof SharedAttachments.apiAttachmentSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiAudit.ApiAuditActorSchema>,
      Input<typeof SharedAudit.apiAuditActorSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiAudit.ApiAuditLogSchema>,
      Input<typeof SharedAudit.apiAuditLogSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiDashboard.ApiAdminDashboardStatsSchema>,
      Input<typeof SharedDashboard.apiAdminDashboardStatsSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiExhibitions.ApiExhibitionImageSchema>,
      Input<typeof SharedExhibitions.apiExhibitionImageSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiExhibitions.ApiExhibitionSchema>,
      Input<typeof SharedExhibitions.apiExhibitionSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiGenerations.ApiGenerationSchema>,
      Input<typeof SharedGenerations.apiGenerationSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiLinktree.ApiLinktreeItemSchema>,
      Input<typeof SharedLinktree.apiLinktreeItemSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiLinktree.ApiLinktreeSchema>,
      Input<typeof SharedLinktree.apiLinktreeSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiRecruiting.ApiRecruitingPlanSchema>,
      Input<typeof SharedRecruiting.apiRecruitingPlanSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiSiteSettings.ApiSiteSettingsSchema>,
      Input<typeof SharedSiteSettings.apiSiteSettingsSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiUploads.ApiPresignResponseSchema>,
      Input<typeof SharedUploads.apiPresignResponseSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiUsers.ApiUserSchema>,
      Input<typeof SharedUsers.apiUserSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiUsers.ApiGenerationMemberSummarySchema>,
      Input<typeof SharedGenerations.apiGenerationMemberSummarySchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof ApiUsers.ApiPublicGenerationWithMembersSchema>,
      Input<typeof SharedGenerations.apiPublicGenerationWithMembersSchema>
    >
  >,
];

export type RequestContractCompatibility = [
  Expect<
    IsAssignable<
      Output<typeof SharedActivities.apiCreateActivityInputSchema>,
      Input<typeof ApiActivities.ApiCreateActivitySchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedActivities.apiUpdateActivityInputSchema>,
      Input<typeof ApiActivities.ApiUpdateActivitySchema>
    >
  >,
  Expect<
    IsAssignable<
      Omit<SharedAttachmentCreate, "mimeType">,
      Omit<ApiAttachmentCreate, "mimeType">
    >
  >,
  Expect<
    IsAssignable<
      ApiAttachmentCreate["mimeType"],
      SharedAttachments.AllowedAttachmentContentType | undefined
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedAttachments.apiUpdateAttachmentInputSchema>,
      Input<typeof ApiAttachments.ApiUpdateAttachmentSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedExhibitions.apiCreateExhibitionInputSchema>,
      Input<typeof ApiExhibitions.ApiCreateExhibitionSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedExhibitions.apiUpdateExhibitionInputSchema>,
      Input<typeof ApiExhibitions.ApiUpdateExhibitionSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedGenerations.apiCreateGenerationInputSchema>,
      Input<typeof ApiGenerations.ApiCreateGenerationSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedGenerations.apiUpdateGenerationInputSchema>,
      Input<typeof ApiGenerations.ApiUpdateGenerationSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedLinktree.apiCreateLinktreeInputSchema>,
      Input<typeof ApiLinktree.ApiCreateLinktreeSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedLinktree.apiUpdateLinktreeInputSchema>,
      Input<typeof ApiLinktree.ApiUpdateLinktreeSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedRecruiting.apiUpsertCurrentRecruitingPlanInputSchema>,
      Input<typeof ApiRecruiting.ApiUpsertCurrentRecruitingPlanSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedSiteSettings.apiUpdateSiteSettingsInputSchema>,
      Input<typeof ApiSiteSettings.ApiUpdateSiteSettingsSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedUploads.apiPresignRequestSchema>,
      Input<typeof ApiUploads.ApiPresignRequestSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedUsers.apiAdminUpdateUserInputSchema>,
      Input<typeof ApiUsers.ApiAdminUpdateUserSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedUsers.apiMemberProfileUpdateInputSchema>,
      Input<typeof ApiUsers.ApiMemberProfileUpdateSchema>
    >
  >,
  Expect<
    IsAssignable<
      Output<typeof SharedUsers.apiBulkUpdateUserRoleInputSchema>,
      Input<typeof ApiUsers.ApiBulkUpdateUserRoleSchema>
    >
  >,
];
