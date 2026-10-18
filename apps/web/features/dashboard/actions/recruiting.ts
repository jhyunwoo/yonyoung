"use server";

import {
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiRecruitingPlanSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
} from "@yonyoung/contracts/schemas";
import type {
  ApiRecruitingPlan,
  ApiUpsertCurrentRecruitingPlanInput,
} from "@yonyoung/contracts";

export const upsertCurrentRecruitingPlanAction = async (
  input: ApiUpsertCurrentRecruitingPlanInput,
): Promise<AdminWriteActionResult<ApiRecruitingPlan>> => {
  return writeRequest({
    path: "/recruiting-plan/current",
    method: "PATCH",
    bodySchema: apiUpsertCurrentRecruitingPlanInputSchema,
    body: input,
    responseSchema: apiRecruitingPlanSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.recruitingPlan, CACHE_TAGS.public.recruitingPlan],
  });
};
