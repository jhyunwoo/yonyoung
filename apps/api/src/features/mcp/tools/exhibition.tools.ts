import { IMAGE_BATCH_MAX_ITEMS } from "@yonyoung/contracts/common";
import { z } from "zod";
import {
  ApiListExhibitionsQuerySchema,
  ApiUpdateExhibitionImageBatchSchema,
  ApiUpdateExhibitionImageSchema,
  ApiUpdateExhibitionSchema,
  ExhibitionInputObjectSchema,
} from "../../exhibitions/exhibition.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { imageBatchItem, nextSortOrder, runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool, uuidArg } from "../tool-definition";
import { describeApiFailure, toolFailure } from "../tool-result";

const exhibitionId = uuidArg("전시 ID. exhibition_list로 찾습니다.");

const imageId = uuidArg("세부 이미지 ID. exhibition_get 결과의 detailImages[].id입니다.");

const coverArgs = {
  cover_file: chatGptFileSchema.optional(),
  cover_upload_id: uploadIdSchema.optional(),
};
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
  defineTool({
    name: "exhibition_create",
    inputSchema: z.object({
      data: ExhibitionInputObjectSchema.extend({
        coverImageUrl: ExhibitionInputObjectSchema.shape.coverImageUrl
          .optional()
          .describe("이미 있는 이미지 URL. 채팅 파일을 쓰면 비웁니다."),
      }).describe("날짜는 밀리초 단위 Unix 시간입니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        if (args.cover_file && args.cover_upload_id) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const covers = await context.files.resolve({
          purpose: "exhibition_cover",
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
          { method: "POST", path: "/api/exhibitions", body: { ...args.data, coverImageUrl } },
          "전시를 만들었습니다.",
        );
      }),
  }),
  defineTool({
    name: "exhibition_update",
    inputSchema: z.object({
      id: exhibitionId,
      data: ApiUpdateExhibitionSchema.describe("바꿀 필드만 넣습니다."),
      ...coverArgs,
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        if (args.cover_file && args.cover_upload_id) {
          return toolFailure("커버 이미지는 하나만 넣을 수 있습니다.");
        }
        const covers = await context.files.resolve({
          purpose: "exhibition_cover",
          chatGptFiles: args.cover_file ? [args.cover_file] : [],
          uploadIds: args.cover_upload_id ? [args.cover_upload_id] : [],
        });
        const body = covers[0] ? { ...args.data, coverImageUrl: covers[0].publicUrl } : args.data;
        return runWithFiles(
          context,
          covers,
          { method: "PATCH", path: `/api/exhibitions/${args.id}`, body },
          "전시를 수정했습니다.",
        );
      }),
  }),
  routeTool({
    name: "exhibition_delete",
    method: "DELETE",
    path: "/api/exhibitions/{id}",
    inputSchema: z.object({ id: exhibitionId }),
    summary: "전시를 삭제했습니다.",
  }),
  defineTool({
    name: "exhibition_images_add",
    inputSchema: z.object({
      id: exhibitionId,
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
        const fileCount = (args.files?.length ?? 0) + (args.upload_ids?.length ?? 0);
        if (fileCount === 0) {
          return toolFailure("추가할 사진을 files 또는 upload_ids로 넣어 주세요.");
        }
        if (fileCount > IMAGE_BATCH_MAX_ITEMS) {
          return toolFailure(`사진은 한 번에 최대 ${IMAGE_BATCH_MAX_ITEMS}장까지 추가할 수 있습니다.`);
        }
        // 전시가 없으면 파일을 받기 전에 끝낸다.
        const exhibition = await context.api.call({ method: "GET", path: `/api/exhibitions/${args.id}` });
        if (!exhibition.ok) {
          return toolFailure(describeApiFailure(exhibition, context.actor.role));
        }
        const files = await context.files.resolve({
          purpose: "exhibition_image",
          chatGptFiles: args.files,
          uploadIds: args.upload_ids,
        });
        const existing =
          (exhibition.data as { detailImages?: Array<{ sortOrder: number }> }).detailImages ?? [];
        const start = args.start_sort_order ?? nextSortOrder(existing);
        return runWithFiles(
          context,
          files,
          {
            method: "POST",
            path: `/api/exhibitions/${args.id}/images/batch`,
            body: files.map((file, index) => imageBatchItem(file, start + index)),
          },
          `사진 ${files.length}장을 추가했습니다.`,
        );
      }),
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
