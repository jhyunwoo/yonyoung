import { z } from "zod";
import {
  ApiListActivitiesQuerySchema,
  ApiUpdateActivityImageBatchSchema,
  ApiUpdateActivityImageSchema,
} from "../../activities/activity.contract";
import { routeTool, uuidArg } from "../tool-definition";

const activityId = uuidArg("활동 ID. activity_list로 찾습니다.");

const imageId = uuidArg("세부 이미지 ID. activity_get 결과의 detailImages[].id입니다.");
export const activityTools = [
  routeTool({
    name: "activity_list",
    method: "GET",
    path: "/api/activities",
    inputSchema: ApiListActivitiesQuerySchema,
    summary: "활동 목록입니다.",
  }),
  routeTool({
    name: "activity_get",
    method: "GET",
    path: "/api/activities/{id}",
    inputSchema: z.object({ id: activityId }),
    summary: "활동 정보입니다.",
  }),
  routeTool({
    name: "activity_delete",
    method: "DELETE",
    path: "/api/activities/{id}",
    inputSchema: z.object({ id: activityId }),
    summary: "활동을 삭제했습니다.",
  }),
  routeTool({
    name: "activity_image_update",
    method: "PATCH",
    path: "/api/activities/{id}/images/{imageId}",
    inputSchema: z.object({ id: activityId, imageId, data: ApiUpdateActivityImageSchema }),
    summary: "세부 이미지를 수정했습니다.",
  }),
  routeTool({
    name: "activity_images_update",
    method: "PATCH",
    path: "/api/activities/{id}/images/batch",
    inputSchema: z.object({ id: activityId, items: ApiUpdateActivityImageBatchSchema }),
    summary: "세부 이미지들을 수정했습니다.",
  }),
  routeTool({
    name: "activity_image_delete",
    method: "DELETE",
    path: "/api/activities/{id}/images/{imageId}",
    inputSchema: z.object({ id: activityId, imageId }),
    summary: "세부 이미지를 삭제했습니다.",
  }),
];
