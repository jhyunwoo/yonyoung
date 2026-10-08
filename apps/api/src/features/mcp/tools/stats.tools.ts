import { z } from "zod";
import { ApiAuditParamSchema, ApiAuditQuerySchema } from "../../audit/audit.contract";
import { ApiAdminDashboardStatsQuerySchema } from "../../dashboard/dashboard.contract";
import { routeTool } from "../tool-definition";

export const statsTools = [
  routeTool({
    name: "dashboard_overview",
    method: "GET",
    path: "/api/admin/dashboard",
    inputSchema: ApiAdminDashboardStatsQuerySchema,
    summary: "대시보드 요약입니다.",
  }),
  routeTool({
    name: "page_view_stats",
    method: "GET",
    path: "/api/admin/page-views/stats",
    inputSchema: z.object({}),
    summary: "방문 통계입니다.",
  }),
  routeTool({
    name: "page_view_dashboard",
    method: "GET",
    path: "/api/admin/page-views/dashboard",
    inputSchema: z.object({}),
    summary: "방문 추이입니다.",
  }),
  routeTool({
    name: "audit_log_get",
    method: "GET",
    path: "/api/audit/{resourceType}/{resourceId}",
    inputSchema: z.object({ ...ApiAuditParamSchema.shape, ...ApiAuditQuerySchema.shape }),
    summary: "변경 기록입니다.",
  }),
];
