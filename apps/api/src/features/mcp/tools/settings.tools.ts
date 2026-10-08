import { z } from "zod";
import { ApiUpdateSiteSettingsSchema } from "../../site-settings/site-settings.contract";
import { routeTool } from "../tool-definition";

export const settingsTools = [
  routeTool({
    name: "site_settings_get",
    method: "GET",
    path: "/api/site-settings",
    inputSchema: z.object({}),
    summary: "사이트 설정입니다.",
  }),
  routeTool({
    name: "recruiting_plan_get",
    method: "GET",
    path: "/api/recruiting-plan/current",
    inputSchema: z.object({}),
    summary: "올해 모집 계획입니다. 저장된 계획이 없으면 data가 null입니다.",
  }),
  routeTool({
    name: "site_settings_update",
    method: "PATCH",
    path: "/api/site-settings",
    inputSchema: z.object({
      data: ApiUpdateSiteSettingsSchema.describe("바꿀 필드만 넣습니다."),
    }),
    summary: "사이트 설정을 수정했습니다.",
  }),
];
