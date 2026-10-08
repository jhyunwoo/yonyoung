import { z } from "zod";
import {
  ApiAdminUpdateUserSchema,
  ApiBulkUpdateUserRoleSchema,
  ApiUserResourceHistoryQuerySchema,
} from "../../users/user.contract";
import { routeTool } from "../tool-definition";

const userId = z.string().min(1).describe("멤버 ID. member_list로 찾습니다.");

export const memberTools = [
  routeTool({
    name: "member_list",
    method: "GET",
    path: "/api/users",
    inputSchema: z.object({}),
    summary: "멤버 목록입니다.",
  }),
  routeTool({
    name: "member_get",
    method: "GET",
    path: "/api/users/{id}",
    inputSchema: z.object({ id: userId }),
    summary: "멤버 정보입니다.",
  }),
  routeTool({
    name: "member_resource_history",
    method: "GET",
    path: "/api/users/{id}/resource-history",
    inputSchema: z.object({ id: userId, ...ApiUserResourceHistoryQuerySchema.shape }),
    summary: "멤버 작업 이력입니다.",
  }),
  routeTool({
    name: "member_update",
    method: "PATCH",
    path: "/api/users/{id}",
    inputSchema: z.object({
      id: userId,
      data: ApiAdminUpdateUserSchema.describe("바꿀 필드만 넣습니다. 역할은 role, 기수는 generationIds입니다."),
    }),
    summary: "멤버 정보를 수정했습니다.",
  }),
  routeTool({
    name: "member_bulk_role",
    method: "PATCH",
    path: "/api/users/bulk-role",
    inputSchema: z.object({ data: ApiBulkUpdateUserRoleSchema }),
    summary: "멤버 역할을 일괄 변경했습니다.",
  }),
  routeTool({
    name: "member_delete",
    method: "DELETE",
    path: "/api/users/{id}",
    inputSchema: z.object({ id: userId }),
    summary: "멤버를 삭제했습니다.",
  }),
];
