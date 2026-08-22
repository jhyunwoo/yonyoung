"use server";

import {
  writeRequest,
  type AdminWriteActionResult,
} from "@/features/dashboard/actions/admin-write-core";
import { CACHE_TAGS } from "@/server/cache/tags";
import {
  apiSiteSettingsSchema,
  apiUpdateSiteSettingsInputSchema,
} from "@/shared/contracts/api-schemas";
import type {
  ApiSiteSettings,
  ApiUpdateSiteSettingsInput,
} from "@/shared/contracts/api-contracts";

export const updateSiteSettingsAction = async (
  input: ApiUpdateSiteSettingsInput,
): Promise<AdminWriteActionResult<ApiSiteSettings>> => {
  const parsedPayload = apiUpdateSiteSettingsInputSchema.safeParse(input);
  if (!parsedPayload.success) {
    const firstIssue = parsedPayload.error.issues[0];
    const firstPath = firstIssue?.path[0];
    const issueMessage =
      firstPath === "footerEmail"
        ? "이메일 형식이 올바르지 않습니다."
        : firstPath === "donateAccountNumber"
          ? "계좌번호는 숫자와 -만 입력할 수 있으며 최대 50자입니다."
          : "기본 설정 입력값 형식을 확인해 주세요.";

    return {
      ok: false,
      errorMessage: issueMessage,
      status: 400,
      code: "VALIDATION_ERROR",
      requestId: null,
    };
  }

  const payload = parsedPayload.data;
  return writeRequest({
    path: "/site-settings",
    method: "PATCH",
    body: payload,
    responseSchema: apiSiteSettingsSchema,
    accessScope: "leadership",
    tags: [CACHE_TAGS.admin.siteSettings, CACHE_TAGS.public.siteSettings],
  });
};
