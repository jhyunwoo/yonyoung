import { z } from "zod";
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
];
