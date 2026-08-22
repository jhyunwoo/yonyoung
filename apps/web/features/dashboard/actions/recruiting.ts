"use server";

import {
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiRecruitingPlanSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiRecruitingPlan,
  ApiUpsertCurrentRecruitingPlanInput,
} from "@/shared/contracts/api-contracts";

export const upsertCurrentRecruitingPlanAction = async (
  input: ApiUpsertCurrentRecruitingPlanInput,
): Promise<AdminWriteActionResult<ApiRecruitingPlan>> => {
  const payload = apiUpsertCurrentRecruitingPlanInputSchema.parse(input);
  return writeRequest({
    path: "/recruiting-plan/current",
    method: "PATCH",
    body: payload,
    responseSchema: apiRecruitingPlanSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.recruitingPlan, CACHE_TAGS.public.recruitingPlan],
  });
};
