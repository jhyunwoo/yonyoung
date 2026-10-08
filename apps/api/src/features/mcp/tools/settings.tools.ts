import { z } from "zod";
import { ApiUpsertCurrentRecruitingPlanSchema } from "../../recruiting-plan/recruiting-plan.contract";
import { ApiUpdateSiteSettingsSchema } from "../../site-settings/site-settings.contract";
import { chatGptFileSchema, uploadIdSchema } from "../files/chatgpt-file";
import { runWithFiles, withUploadErrors } from "../files/file-tool";
import { defineTool, routeTool } from "../tool-definition";
import { toolFailure } from "../tool-result";

const MAX_PROMOTION_IMAGES = 10;

export const settingsTools = [
  routeTool({
    name: "site_settings_get",
    method: "GET",
    path: "/api/site-settings",
    inputSchema: z.object({}),
    summary: "사이트 설정입니다.",
  }),
  routeTool({
    name: "recruiting_plan_get",
    method: "GET",
    path: "/api/recruiting-plan/current",
    inputSchema: z.object({}),
    summary: "올해 모집 계획입니다. 저장된 계획이 없으면 data가 null입니다.",
  }),
  defineTool({
    name: "recruiting_plan_upsert",
    inputSchema: z.object({
      data: ApiUpsertCurrentRecruitingPlanSchema.describe(
        "promotionImageUrls에는 유지할 기존 이미지 URL을 넣습니다. 날짜는 밀리초 단위 Unix 시간입니다.",
      ),
      promotion_files: z.array(chatGptFileSchema).max(MAX_PROMOTION_IMAGES).optional(),
      promotion_upload_ids: z.array(uploadIdSchema).max(MAX_PROMOTION_IMAGES).optional(),
    }),
    handler: (args, context) =>
      withUploadErrors(context, async () => {
        const imageCount =
          args.data.promotionImageUrls.length +
          (args.promotion_files?.length ?? 0) +
          (args.promotion_upload_ids?.length ?? 0);
        if (imageCount > MAX_PROMOTION_IMAGES) {
          return toolFailure(`홍보 이미지는 최대 ${MAX_PROMOTION_IMAGES}장입니다.`);
        }
        const files = await context.files.resolve({
          purpose: "recruiting_image",
          chatGptFiles: args.promotion_files,
          uploadIds: args.promotion_upload_ids,
        });
        const promotionImageUrls = [
          ...args.data.promotionImageUrls,
          ...files.map((file) => file.publicUrl),
        ];
        return runWithFiles(
          context,
          files,
          {
            method: "PATCH",
            path: "/api/recruiting-plan/current",
            body: { ...args.data, promotionImageUrls },
          },
          "모집 계획을 저장했습니다.",
        );
      }),
  }),
  routeTool({
    name: "site_settings_update",
    method: "PATCH",
    path: "/api/site-settings",
    inputSchema: z.object({
      data: ApiUpdateSiteSettingsSchema.describe("바꿀 필드만 넣습니다."),
    }),
    summary: "사이트 설정을 수정했습니다.",
  }),
];
