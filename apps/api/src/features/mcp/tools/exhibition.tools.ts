import { z } from "zod";
import {
  ApiListExhibitionsQuerySchema,
  ApiUpdateExhibitionImageBatchSchema,
  ApiUpdateExhibitionImageSchema,
} from "../../exhibitions/exhibition.contract";
import { routeTool, uuidArg } from "../tool-definition";

const exhibitionId = uuidArg("전시 ID. exhibition_list로 찾습니다.");

const imageId = uuidArg("세부 이미지 ID. exhibition_get 결과의 detailImages[].id입니다.");
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
  routeTool({
    name: "exhibition_delete",
    method: "DELETE",
    path: "/api/exhibitions/{id}",
    inputSchema: z.object({ id: exhibitionId }),
    summary: "전시을 삭제했습니다.",
  }),
  routeTool({
    name: "exhibition_image_update",
    method: "PATCH",
    path: "/api/exhibitions/{id}/images/{imageId}",
    inputSchema: z.object({ id: exhibitionId, imageId, data: ApiUpdateExhibitionImageSchema }),
    summary: "세부 이미지를 수정했습니다.",
  }),
  routeTool({
    name: "exhibition_images_update",
    method: "PATCH",
    path: "/api/exhibitions/{id}/images/batch",
    inputSchema: z.object({ id: exhibitionId, items: ApiUpdateExhibitionImageBatchSchema }),
    summary: "세부 이미지들을 수정했습니다.",
  }),
  routeTool({
    name: "exhibition_image_delete",
    method: "DELETE",
    path: "/api/exhibitions/{id}/images/{imageId}",
    inputSchema: z.object({ id: exhibitionId, imageId }),
    summary: "세부 이미지를 삭제했습니다.",
  }),
];
