import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiActivityImageSchema,
  apiActivitySchema,
  apiCreateActivityImageInputSchema,
  apiCreateActivityInputSchema,
  apiCreateExhibitionImageInputSchema,
  apiCreateExhibitionInputSchema,
  apiCreateGenerationInputSchema,
  apiCreateLinktreeInputSchema,
  apiCreateLinktreeItemInputSchema,
  apiExhibitionImageSchema,
  apiExhibitionSchema,
  apiGenerationSchema,
  apiLinktreeItemSchema,
  apiLinktreeSchema,
  apiRecruitingPlanSchema,
  apiReorderGenerationsInputSchema,
  apiSiteSettingsSchema,
  apiUpdateActivityImageInputSchema,
  apiUpdateActivityInputSchema,
  apiUpdateExhibitionImageInputSchema,
  apiUpdateExhibitionInputSchema,
  apiUpdateGenerationInputSchema,
  apiUpdateLinktreeInputSchema,
  apiUpdateLinktreeItemInputSchema,
  apiUpsertCurrentRecruitingPlanInputSchema,
} from "@yonyoung/contracts/schemas";

type CapturedWriteRequest = {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  responseSchema: unknown;
  bodySchema?: { safeParse: (value: unknown) => { success: boolean } };
  accessScope?: string;
  tags: readonly string[];
};

const { noContentSchema, writeRequestMock } = vi.hoisted(() => ({
  noContentSchema: { kind: "no-content" },
  writeRequestMock: vi
    .fn<
      (input: CapturedWriteRequest) => Promise<{
        ok: true;
        data: undefined;
      }>
    >()
    .mockResolvedValue({
      ok: true,
      data: undefined,
    }),
}));

vi.mock("@/features/dashboard/actions/admin-write-core", () => ({
  readNoContentSchema: noContentSchema,
  writeRequest: writeRequestMock,
}));

import {
  addActivityImageAction,
  addActivityImagesAction,
  createActivityAction,
  deleteActivityAction,
  deleteActivityImageAction,
  updateActivityAction,
  updateActivityImageAction,
  updateActivityImagesAction,
} from "@/features/dashboard/actions/activities";
import {
  addExhibitionImageAction,
  addExhibitionImagesAction,
  createExhibitionAction,
  deleteExhibitionAction,
  deleteExhibitionImageAction,
  updateExhibitionAction,
  updateExhibitionImageAction,
  updateExhibitionImagesAction,
} from "@/features/dashboard/actions/exhibitions";
import {
  createGenerationAction,
  deleteGenerationAction,
  reorderGenerationsAction,
  updateGenerationAction,
} from "@/features/dashboard/actions/generations";
import {
  addLinktreeItemAction,
  createLinktreeAction,
  deleteLinktreeAction,
  deleteLinktreeItemAction,
  updateLinktreeAction,
  updateLinktreeItemAction,
} from "@/features/dashboard/actions/linktree";
import { upsertCurrentRecruitingPlanAction } from "@/features/dashboard/actions/recruiting";
import { updateSiteSettingsAction } from "@/features/dashboard/actions/site-settings";

const lastRequest = (): CapturedWriteRequest => {
  const call = writeRequestMock.mock.lastCall;
  if (!call) {
    throw new Error("writeRequest 호출이 없습니다.");
  }
  return call[0];
};

const activityInput = {
  title: "정기 활동",
  description: "활동 설명",
  startDate: 1,
  endDate: 2,
  coverImageUrl: "https://images.example.com/activity.jpg",
  generationId: "generation-1",
};

const activityImageInput = {
  imageUrl: "https://images.example.com/activity-detail.jpg",
  sortOrder: 0,
  width: 1200,
  height: 800,
};

const exhibitionInput = {
  title: "정기 전시",
  startDate: 1,
  endDate: 2,
  generationId: "generation-1",
  place: "연희관",
  coverImageUrl: "https://images.example.com/exhibition.jpg",
  description: "전시 설명",
};

const exhibitionImageInput = {
  imageUrl: "https://images.example.com/exhibition-detail.jpg",
  sortOrder: 0,
  width: 1200,
  height: 800,
};

type ActionContract = {
  name: string;
  invoke: () => Promise<unknown>;
  path: string;
  method: CapturedWriteRequest["method"];
  accessScope: string;
  tags: readonly string[];
  responseSchema: unknown | "array";
  bodySchema?: unknown | "array";
};

const actionContracts: ActionContract[] = [
  {
    name: "활동 생성",
    invoke: () => createActivityAction(activityInput),
    path: "/activities",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities"],
    responseSchema: apiActivitySchema,
    bodySchema: apiCreateActivityInputSchema,
  },
  {
    name: "활동 수정",
    invoke: () => updateActivityAction("activity-1", { title: "수정" }),
    path: "/activities/activity-1",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: apiActivitySchema,
    bodySchema: apiUpdateActivityInputSchema,
  },
  {
    name: "활동 삭제",
    invoke: () => deleteActivityAction("activity-1"),
    path: "/activities/activity-1",
    method: "DELETE",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: noContentSchema,
  },
  {
    name: "활동 이미지 생성",
    invoke: () => addActivityImageAction("activity-1", activityImageInput),
    path: "/activities/activity-1/images",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: apiActivityImageSchema,
    bodySchema: apiCreateActivityImageInputSchema,
  },
  {
    name: "활동 이미지 일괄 생성",
    invoke: () => addActivityImagesAction("activity-1", [activityImageInput]),
    path: "/activities/activity-1/images/batch",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: "array",
    bodySchema: "array",
  },
  {
    name: "활동 이미지 수정",
    invoke: () => updateActivityImageAction("activity-1", "image-1", { sortOrder: 1 }),
    path: "/activities/activity-1/images/image-1",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: apiActivityImageSchema,
    bodySchema: apiUpdateActivityImageInputSchema,
  },
  {
    name: "활동 이미지 일괄 수정",
    invoke: () =>
      updateActivityImagesAction("activity-1", [{ imageId: "image-1", sortOrder: 1 }]),
    path: "/activities/activity-1/images/batch",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: "array",
    bodySchema: "array",
  },
  {
    name: "활동 이미지 삭제",
    invoke: () => deleteActivityImageAction("activity-1", "image-1"),
    path: "/activities/activity-1/images/image-1",
    method: "DELETE",
    accessScope: "manager",
    tags: ["admin:activities", "public:activities", "public:activity:activity-1"],
    responseSchema: noContentSchema,
  },
  {
    name: "전시 생성",
    invoke: () => createExhibitionAction(exhibitionInput),
    path: "/exhibitions",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions"],
    responseSchema: apiExhibitionSchema,
    bodySchema: apiCreateExhibitionInputSchema,
  },
  {
    name: "전시 수정",
    invoke: () => updateExhibitionAction("exhibition-1", { title: "수정" }),
    path: "/exhibitions/exhibition-1",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: apiExhibitionSchema,
    bodySchema: apiUpdateExhibitionInputSchema,
  },
  {
    name: "전시 삭제",
    invoke: () => deleteExhibitionAction("exhibition-1"),
    path: "/exhibitions/exhibition-1",
    method: "DELETE",
    accessScope: "leadership",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: noContentSchema,
  },
  {
    name: "전시 이미지 생성",
    invoke: () => addExhibitionImageAction("exhibition-1", exhibitionImageInput),
    path: "/exhibitions/exhibition-1/images",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: apiExhibitionImageSchema,
    bodySchema: apiCreateExhibitionImageInputSchema,
  },
  {
    name: "전시 이미지 일괄 생성",
    invoke: () => addExhibitionImagesAction("exhibition-1", [exhibitionImageInput]),
    path: "/exhibitions/exhibition-1/images/batch",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: "array",
    bodySchema: "array",
  },
  {
    name: "전시 이미지 수정",
    invoke: () =>
      updateExhibitionImageAction("exhibition-1", "image-1", { sortOrder: 1 }),
    path: "/exhibitions/exhibition-1/images/image-1",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: apiExhibitionImageSchema,
    bodySchema: apiUpdateExhibitionImageInputSchema,
  },
  {
    name: "전시 이미지 일괄 수정",
    invoke: () =>
      updateExhibitionImagesAction("exhibition-1", [
        { imageId: "image-1", sortOrder: 1 },
      ]),
    path: "/exhibitions/exhibition-1/images/batch",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: "array",
    bodySchema: "array",
  },
  {
    name: "전시 이미지 삭제",
    invoke: () => deleteExhibitionImageAction("exhibition-1", "image-1"),
    path: "/exhibitions/exhibition-1/images/image-1",
    method: "DELETE",
    accessScope: "manager",
    tags: ["admin:exhibitions", "public:exhibitions", "public:exhibition:exhibition-1"],
    responseSchema: noContentSchema,
  },
  {
    name: "기수 생성",
    invoke: () =>
      createGenerationAction({
        name: "60기",
        sortOrder: 60,
        startDate: 1,
        endDate: 2,
      }),
    path: "/generations",
    method: "POST",
    accessScope: "leadership",
    tags: [
      "admin:generations",
      "admin:users",
      "public:generations",
      "public:photographers",
    ],
    responseSchema: apiGenerationSchema,
    bodySchema: apiCreateGenerationInputSchema,
  },
  {
    name: "기수 수정",
    invoke: () => updateGenerationAction("generation-1", { name: "60기" }),
    path: "/generations/generation-1",
    method: "PATCH",
    accessScope: "leadership",
    tags: [
      "admin:generations",
      "admin:users",
      "public:generations",
      "public:photographers",
    ],
    responseSchema: apiGenerationSchema,
    bodySchema: apiUpdateGenerationInputSchema,
  },
  {
    name: "기수 순서 변경",
    invoke: () =>
      reorderGenerationsAction({
        items: [
          { id: "generation-1", sortOrder: 59 },
          { id: "generation-2", sortOrder: 58 },
        ],
      }),
    path: "/generations/reorder",
    method: "POST",
    accessScope: "leadership",
    tags: [
      "admin:generations",
      "admin:users",
      "public:generations",
      "public:photographers",
    ],
    responseSchema: "array",
    bodySchema: apiReorderGenerationsInputSchema,
  },
  {
    name: "기수 삭제",
    invoke: () => deleteGenerationAction("generation-1"),
    path: "/generations/generation-1",
    method: "DELETE",
    accessScope: "leadership",
    tags: [
      "admin:generations",
      "admin:users",
      "public:generations",
      "public:photographers",
    ],
    responseSchema: noContentSchema,
  },
  {
    name: "링크트리 생성",
    invoke: () => createLinktreeAction({ name: "공식 채널" }),
    path: "/linktree",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:linktree", "public:linktree"],
    responseSchema: apiLinktreeSchema,
    bodySchema: apiCreateLinktreeInputSchema,
  },
  {
    name: "링크트리 수정",
    invoke: () => updateLinktreeAction("linktree-1", { name: "수정" }),
    path: "/linktree/linktree-1",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:linktree", "public:linktree"],
    responseSchema: apiLinktreeSchema,
    bodySchema: apiUpdateLinktreeInputSchema,
  },
  {
    name: "링크트리 삭제",
    invoke: () => deleteLinktreeAction("linktree-1"),
    path: "/linktree/linktree-1",
    method: "DELETE",
    accessScope: "manager",
    tags: ["admin:linktree", "public:linktree"],
    responseSchema: noContentSchema,
  },
  {
    name: "링크트리 항목 생성",
    invoke: () =>
      addLinktreeItemAction("linktree-1", {
        name: "Instagram",
        link: "https://instagram.com/yonyoung",
      }),
    path: "/linktree/linktree-1/items",
    method: "POST",
    accessScope: "manager",
    tags: ["admin:linktree", "public:linktree"],
    responseSchema: apiLinktreeItemSchema,
    bodySchema: apiCreateLinktreeItemInputSchema,
  },
  {
    name: "링크트리 항목 수정",
    invoke: () =>
      updateLinktreeItemAction("linktree-1", "item-1", {
        name: "Instagram",
      }),
    path: "/linktree/linktree-1/items/item-1",
    method: "PATCH",
    accessScope: "manager",
    tags: ["admin:linktree", "public:linktree"],
    responseSchema: apiLinktreeItemSchema,
    bodySchema: apiUpdateLinktreeItemInputSchema,
  },
  {
    name: "링크트리 항목 삭제",
    invoke: () => deleteLinktreeItemAction("linktree-1", "item-1"),
    path: "/linktree/linktree-1/items/item-1",
    method: "DELETE",
    accessScope: "manager",
    tags: ["admin:linktree", "public:linktree"],
    responseSchema: noContentSchema,
  },
  {
    name: "모집 계획 갱신",
    invoke: () =>
      upsertCurrentRecruitingPlanAction({
        title: "60기 모집",
        content: "모집 안내",
        promotionImageUrls: ["https://images.example.com/recruiting.jpg"],
        recruitmentStartAt: 1,
        recruitmentEndAt: 2,
      }),
    path: "/recruiting-plan/current",
    method: "PATCH",
    accessScope: "leadership",
    tags: ["admin:recruiting-plan", "public:recruiting-plan"],
    responseSchema: apiRecruitingPlanSchema,
    bodySchema: apiUpsertCurrentRecruitingPlanInputSchema,
  },
  {
    name: "사이트 설정 수정",
    invoke: () => updateSiteSettingsAction({ footerEmail: "admin@example.com" }),
    path: "/site-settings",
    method: "PATCH",
    accessScope: "leadership",
    tags: ["admin:site-settings", "public:site-settings"],
    responseSchema: apiSiteSettingsSchema,
  },
];

describe("dashboard domain action contracts", () => {
  beforeEach(() => {
    writeRequestMock.mockClear();
  });

  for (const contract of actionContracts) {
    it(`${contract.name}의 API와 권한 및 캐시 계약을 유지한다`, async () => {
      await contract.invoke();

      expect(writeRequestMock).toHaveBeenCalledTimes(1);
      const request = lastRequest();
      expect(request).toMatchObject({
        path: contract.path,
        method: contract.method,
        accessScope: contract.accessScope,
        tags: contract.tags,
      });

      if (contract.responseSchema === "array") {
        expect(request.responseSchema).toHaveProperty("safeParse");
      } else {
        expect(request.responseSchema).toBe(contract.responseSchema);
      }

      if (contract.bodySchema === "array") {
        expect(request.bodySchema).toHaveProperty("safeParse");
      } else {
        expect(request.bodySchema).toBe(contract.bodySchema);
      }
    });
  }

  it("batch payload를 request schema와 함께 넘겨 writeRequest가 검증하게 한다", async () => {
    await addActivityImagesAction("activity-1", [
      {
        imageUrl: "invalid-url",
        sortOrder: 0,
      },
    ]);
    const addRequest = lastRequest();
    expect(addRequest.bodySchema?.safeParse(addRequest.body).success).toBe(false);

    await updateExhibitionImagesAction("exhibition-1", [
      {
        imageId: "image-1",
        sortOrder: 1.5,
      },
    ]);
    const updateRequest = lastRequest();
    expect(updateRequest.bodySchema?.safeParse(updateRequest.body).success).toBe(false);
  });
});
