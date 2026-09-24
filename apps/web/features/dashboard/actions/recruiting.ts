"use server";

import {
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { parseActionInput } from "@/features/dashboard/actions/action-input";
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
  const parsedPayload = parseActionInput(
    apiUpsertCurrentRecruitingPlanInputSchema,
    input,
  );
  if (!parsedPayload.ok) {
    return parsedPayload;
  }
  const payload = parsedPayload.data;
  return writeRequest({
    path: "/recruiting-plan/current",
    method: "PATCH",
    body: payload,
    responseSchema: apiRecruitingPlanSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.recruitingPlan, CACHE_TAGS.public.recruitingPlan],
  });
};
