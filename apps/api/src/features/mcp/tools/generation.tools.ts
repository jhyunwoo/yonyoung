import { z } from "zod";
import {
  ApiCreateGenerationSchema,
  ApiReorderGenerationsSchema,
  ApiUpdateGenerationSchema,
} from "../../generations/generation.contract";
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
  routeTool({
    name: "generation_create",
    method: "POST",
    path: "/api/generations",
    inputSchema: z.object({
      data: ApiCreateGenerationSchema.describe(
        "날짜는 밀리초 단위 Unix 시간입니다.",
      ),
    }),
    summary: "기수를 만들었습니다.",
  }),
  routeTool({
    name: "generation_update",
    method: "PATCH",
    path: "/api/generations/{id}",
    inputSchema: z.object({
      id: uuidArg("기수 ID"),
      data: ApiUpdateGenerationSchema.describe("바꿀 필드만 넣습니다."),
    }),
    summary: "기수를 수정했습니다.",
  }),
  routeTool({
    name: "generation_reorder",
    method: "POST",
    path: "/api/generations/reorder",
    inputSchema: z.object({ data: ApiReorderGenerationsSchema }),
    summary: "기수 순서를 바꿨습니다.",
  }),
  routeTool({
    name: "generation_delete",
    method: "DELETE",
    path: "/api/generations/{id}",
    inputSchema: byId,
    summary: "기수를 삭제했습니다.",
  }),
];
