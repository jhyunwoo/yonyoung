import { z } from "zod";
import { routeTool, uuidArg } from "../tool-definition";

const byId = z.object({ id: uuidArg("기수 ID. generation_list로 찾습니다.") });

export const generationTools = [
  routeTool({
    name: "generation_list",
    method: "GET",
    path: "/api/generations",
    inputSchema: z.object({}),
    summary: "기수 목록입니다.",
  }),
  routeTool({
    name: "generation_get",
    method: "GET",
    path: "/api/generations/{id}",
    inputSchema: byId,
    summary: "기수 정보입니다.",
  }),
  routeTool({
    name: "generation_members",
    method: "GET",
    path: "/api/generations/{id}/members",
    inputSchema: byId,
    summary: "기수 멤버 목록입니다.",
  }),
];
