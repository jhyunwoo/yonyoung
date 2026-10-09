import { IMAGE_BATCH_MAX_ITEMS } from "@yonyoung/contracts/common";
import { z } from "zod";
import {
  ApiCreateActivitySchema,
  ApiListActivitiesQuerySchema,
  ApiUpdateActivityImageBatchSchema,
  ApiUpdateActivityImageSchema,
  ApiUpdateActivitySchema,
} from "../../activities/activity.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import {
  imageBatchItem,
  nextSortOrder,
  runWithFiles,
  withUploadErrors,
} from "../files/file-tool";
import { defineTool, routeTool, uuidArg } from "../tool-definition";
import { describeApiFailure, toolFailure } from "../tool-result";

const activityId = uuidArg("활동 ID. activity_list로 찾습니다.");

const imageId = uuidArg(
  "세부 이미지 ID. activity_get 결과의 detailImages[].id입니다.",
);

const coverArgs = {
  cover_file: chatGptFileSchema.optional(),
  cover_upload_id: uploadIdSchema.optional(),
};
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
            .describe("이미 있는 이미지 URL. 채팅 파일을 쓰면 비웁니다."),
        })
        .describe("날짜는 밀리초 단위 Unix 시간입니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        if (args.cover_file && args.cover_upload_id) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const covers = await context.files.resolve({
          purpose: "activity_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        const coverImageUrl = covers[0]?.publicUrl ?? args.data.coverImageUrl;
        if (!coverImageUrl) {
          return toolFailure(
            "커버 이미지가 필요합니다. data.coverImageUrl, cover_file, cover_upload_id 중 하나를 넣어 주세요.",
          );
        }
        return runWithFiles(
          context,
          covers,
          {
            method: "POST",
            path: "/api/activities",
            body: { ...args.data, coverImageUrl },
          },
          "활동을 만들었습니다.",
        );
      }),
  }),
  defineTool({
    name: "activity_update",
    inputSchema: z.object({
      id: activityId,
      data: ApiUpdateActivitySchema.describe("바꿀 필드만 넣습니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        if (args.cover_file && args.cover_upload_id) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const covers = await context.files.resolve({
          purpose: "activity_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        const body = covers[0]
          ? { ...args.data, coverImageUrl: covers[0].publicUrl }
          : args.data;
        return runWithFiles(
          context,
          covers,
          { method: "PATCH", path: `/api/activities/${args.id}`, body },
          "활동을 수정했습니다.",
        );
      }),
  }),
  routeTool({
    name: "activity_delete",
    method: "DELETE",
    path: "/api/activities/{id}",
    inputSchema: z.object({ id: activityId }),
    summary: "활동을 삭제했습니다.",
  }),
  defineTool({
    name: "activity_images_add",
    inputSchema: z.object({
      id: activityId,
      files: z.array(chatGptFileSchema).max(IMAGE_BATCH_MAX_ITEMS).optional(),
      upload_ids: z.array(uploadIdSchema).max(IMAGE_BATCH_MAX_ITEMS).optional(),
      start_sort_order: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("첫 사진의 표시 순서. 비우면 기존 사진 뒤에 붙습니다."),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const fileCount =
          (args.files?.length ?? 0) + (args.upload_ids?.length ?? 0);
        if (fileCount === 0) {
          return toolFailure(
            "추가할 사진을 files 또는 upload_ids로 넣어 주세요.",
          );
        }
        if (fileCount > IMAGE_BATCH_MAX_ITEMS) {
          return toolFailure(
            `사진은 한 번에 최대 ${IMAGE_BATCH_MAX_ITEMS}장까지 추가할 수 있습니다.`,
          );
        }
        // 활동이 없으면 파일을 받기 전에 끝낸다.
        const activity = await context.api.call({
          method: "GET",
          path: `/api/activities/${args.id}`,
        });
        if (!activity.ok) {
          return toolFailure(describeApiFailure(activity, context.actor.role));
        }
        const files = await context.files.resolve({
          purpose: "activity_image",
          chatGptFiles: args.files,
          uploadIds: args.upload_ids,
        });
        const existing =
          (activity.data as { detailImages?: Array<{ sortOrder: number }> })
            .detailImages ?? [];
        const start = args.start_sort_order ?? nextSortOrder(existing);
        return runWithFiles(
          context,
          files,
          {
            method: "POST",
            path: `/api/activities/${args.id}/images/batch`,
            body: files.map((file, index) =>
              imageBatchItem(file, start + index),
            ),
          },
          `사진 ${files.length}장을 추가했습니다.`,
        );
      }),
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
