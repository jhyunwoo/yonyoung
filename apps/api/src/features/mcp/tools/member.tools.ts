import { z } from "zod";
import { ApiUserResourceHistoryQuerySchema } from "../../users/user.contract";
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
];
