import { z } from "zod";
import { routeTool, uuidArg } from "../tool-definition";

const linktreeId = uuidArg("링크 모음 ID. linktree_list로 찾습니다.");

export const linktreeTools = [
  routeTool({
    name: "linktree_list",
    method: "GET",
    path: "/api/linktree",
    inputSchema: z.object({}),
    summary: "링크 모음 목록입니다.",
  }),
  routeTool({
    name: "linktree_get",
    method: "GET",
    path: "/api/linktree/{id}",
    inputSchema: z.object({ id: linktreeId }),
    summary: "링크 모음 정보입니다.",
  }),
];
