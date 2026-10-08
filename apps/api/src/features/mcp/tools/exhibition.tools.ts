import { z } from "zod";
import { ApiListExhibitionsQuerySchema } from "../../exhibitions/exhibition.contract";
import { routeTool, uuidArg } from "../tool-definition";

const exhibitionId = uuidArg("전시 ID. exhibition_list로 찾습니다.");

export const exhibitionTools = [
  routeTool({
    name: "exhibition_list",
    method: "GET",
    path: "/api/exhibitions",
    inputSchema: ApiListExhibitionsQuerySchema,
    summary: "전시 목록입니다.",
  }),
  routeTool({
    name: "exhibition_get",
    method: "GET",
    path: "/api/exhibitions/{id}",
    inputSchema: z.object({ id: exhibitionId }),
    summary: "전시 정보입니다.",
  }),
];
