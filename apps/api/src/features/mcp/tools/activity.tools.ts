import { z } from "zod";
import {
  ApiCreateActivitySchema,
  ApiListActivitiesQuerySchema,
  ApiUpdateActivityImageBatchSchema,
  ApiUpdateActivityImageSchema,
  ApiUpdateActivitySchema,
} from "../../activities/activity.contract";
import { createWithDashboardLink } from "../dashboard-link";
import { defineTool, routeTool, uuidArg } from "../tool-definition";

const activityId = uuidArg("활동 ID. activity_list로 찾습니다.");

const imageId = uuidArg(
  "세부 이미지 ID. activity_get 결과의 detailImages[].id입니다.",
);

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
  defineTool({
    name: "activity_create",
    inputSchema: z.object({
      // 생성 스키마에는 refine이 있어 extend로 키를 덮을 수 없다. 날짜 검사는 라우트가 한다.
      data: z
        .object({
          ...ApiCreateActivitySchema.shape,
          coverImageUrl: ApiCreateActivitySchema.shape.coverImageUrl
            .optional()
            .describe("이미 있는 이미지 URL. 비우면 기본 이미지로 만듭니다."),
        })
        .describe("날짜는 밀리초 단위 Unix 시간입니다."),
    }),
    handler: (args, context) =>
      createWithDashboardLink(context, {
        resource: "activities",
        data: args.data,
        summary: "활동을 만들었습니다.",
      }),
  }),
  routeTool({
    name: "activity_update",
    method: "PATCH",
    path: "/api/activities/{id}",
    inputSchema: z.object({
      id: activityId,
      data: ApiUpdateActivitySchema.describe("바꿀 필드만 넣습니다."),
    }),
    summary: "활동을 수정했습니다.",
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
    inputSchema: z.object({
      id: activityId,
      imageId,
      data: ApiUpdateActivityImageSchema,
    }),
    summary: "세부 이미지를 수정했습니다.",
  }),
  routeTool({
    name: "activity_images_update",
    method: "PATCH",
    path: "/api/activities/{id}/images/batch",
    inputSchema: z.object({
      id: activityId,
      items: ApiUpdateActivityImageBatchSchema,
    }),
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
