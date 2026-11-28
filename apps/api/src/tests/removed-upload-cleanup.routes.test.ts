import { describe, expect, it, vi } from "vitest";
import {
  createActor,
  createDataServiceMock,
  createTestApp,
  IDs,
} from "./test-helpers";

const signedUrl = (key: string) =>
  `https://yonyoung.example/api/public/media/${key}?sig=abc`;

const KEYS = {
  cover: "activities/user-1/cover/aaaa-cover.jpg",
  newCover: "activities/user-1/cover/bbbb-cover.jpg",
  detail: "activities/user-1/detail/cccc-detail.jpg",
  inline: "activities/user-1/detail/dddd-inline.jpg",
  attachment: "site/user-1/file/eeee-doc.pdf",
  profile: "users/user-2/profile/ffff-me.jpg",
  showcaseKept: "users/user-2/profile/gggg-kept.jpg",
  showcaseRemoved: "users/user-2/profile/hhhh-removed.jpg",
};

const ACTIVITY_ID = "20000000-0000-4000-8000-000000000001";
const IMAGE_ID = "21000000-0000-4000-8000-000000000001";
const ATTACHMENT_ID = "30000000-0000-4000-8000-000000000001";
const NOW = new Date("2031-01-01T00:00:00.000Z");

const activity = (overrides: Record<string, unknown> = {}) => ({
  id: ACTIVITY_ID,
  title: "출사",
  description: `<p><img src="${signedUrl(KEYS.inline)}"></p>`,
  startDate: NOW,
  endDate: NOW,
  coverImageUrl: signedUrl(KEYS.cover),
  generationId: IDs.generation,
  createdAt: NOW,
  updatedAt: NOW,
  updatedBy: null,
  detailImages: [
    {
      id: IMAGE_ID,
      activityId: ACTIVITY_ID,
      imageUrl: signedUrl(KEYS.detail),
      sortOrder: 0,
      width: null,
      height: null,
    },
  ],
  ...overrides,
});

const createCleanupApp = (
  role: Parameters<typeof createActor>[0],
  actorId: string,
  dataService: Parameters<typeof createDataServiceMock>[0],
) => {
  const deleteUnreferencedUploads = vi.fn(
    async (_c: unknown, _keys: readonly string[]) => undefined,
  );
  const app = createTestApp({
    actor: createActor(role, actorId),
    dataService: createDataServiceMock(dataService),
    overrides: { deleteUnreferencedUploads },
  });
  const cleanedKeys = () =>
    deleteUnreferencedUploads.mock.calls
      .flatMap(([, keys]) => [...keys])
      .sort();
  return { app, deleteUnreferencedUploads, cleanedKeys };
};

describe("삭제·교체된 업로드 파일의 즉시 정리", () => {
  it("활동을 지우면 커버·본문·세부 이미지·첨부파일을 정리 대상으로 넘긴다", async () => {
    const { app, cleanedKeys } = createCleanupApp("manager", IDs.manager, {
      getActivityById: async () => activity() as never,
      listAttachments: async () =>
        [{ fileUrl: signedUrl(KEYS.attachment) }] as never,
      deleteActivity: async () => true,
    });

    const response = await app.request(`/api/activities/${ACTIVITY_ID}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(cleanedKeys()).toEqual(
      [KEYS.cover, KEYS.inline, KEYS.detail, KEYS.attachment].sort(),
    );
  });

  it("커버를 교체하면 이전 커버만 정리 대상으로 넘긴다", async () => {
    const { app, cleanedKeys } = createCleanupApp("manager", IDs.manager, {
      getActivityById: async () => activity() as never,
      updateActivity: async () =>
        activity({ coverImageUrl: signedUrl(KEYS.newCover) }) as never,
    });

    const response = await app.request(`/api/activities/${ACTIVITY_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coverImageUrl: signedUrl(KEYS.newCover) }),
    });

    expect(response.status).toBe(200);
    expect(cleanedKeys()).toEqual([KEYS.cover]);
  });

  it("파일과 무관한 수정은 정리를 건너뛴다", async () => {
    const getActivityById = vi.fn(async () => activity() as never);
    const { app, deleteUnreferencedUploads } = createCleanupApp(
      "manager",
      IDs.manager,
      {
        getActivityById,
        updateActivity: async () => activity({ title: "새 제목" }) as never,
      },
    );

    const response = await app.request(`/api/activities/${ACTIVITY_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "새 제목" }),
    });

    expect(response.status).toBe(200);
    expect(getActivityById).not.toHaveBeenCalled();
    expect(deleteUnreferencedUploads).not.toHaveBeenCalled();
  });

  it("세부 이미지를 지우면 그 활동의 파일을 정리 대상으로 넘긴다", async () => {
    const { app, cleanedKeys } = createCleanupApp("manager", IDs.manager, {
      getActivityById: async () => activity() as never,
      deleteActivityImage: async () => true,
    });

    const response = await app.request(
      `/api/activities/${ACTIVITY_ID}/images/${IMAGE_ID}`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(204);
    expect(cleanedKeys()).toContain(KEYS.detail);
  });

  it("첨부파일을 지우면 그 파일을 정리 대상으로 넘긴다", async () => {
    const { app, cleanedKeys } = createCleanupApp("president", IDs.president, {
      getAttachmentById: async () =>
        ({
          id: ATTACHMENT_ID,
          scope: "site_donate",
          resourceId: null,
          fileUrl: signedUrl(KEYS.attachment),
        }) as never,
      deleteAttachment: async () => true,
    });

    const response = await app.request(`/api/attachments/${ATTACHMENT_ID}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    expect(cleanedKeys()).toEqual([KEYS.attachment]);
  });

  it("대표 사진을 빼면 빠진 사진만 정리 대상으로 넘긴다", async () => {
    const member = {
      id: IDs.member,
      role: "regular_member",
      image: signedUrl(KEYS.profile),
      showcaseImageUrls: [
        signedUrl(KEYS.showcaseKept),
        signedUrl(KEYS.showcaseRemoved),
      ],
    };
    const { app, cleanedKeys } = createCleanupApp(
      "regular_member",
      IDs.member,
      {
        getUserById: async () => member as never,
        updateUser: async () =>
          ({
            ...member,
            showcaseImageUrls: [signedUrl(KEYS.showcaseKept)],
          }) as never,
      },
    );

    const response = await app.request(`/api/users/${IDs.member}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        showcaseImageUrls: [signedUrl(KEYS.showcaseKept)],
      }),
    });

    expect(response.status).toBe(200);
    expect(cleanedKeys()).toEqual([KEYS.showcaseRemoved]);
  });

  it("정리가 실패해도 삭제 요청은 성공한다", async () => {
    const app = createTestApp({
      actor: createActor("manager", IDs.manager),
      dataService: createDataServiceMock({
        getActivityById: async () => activity() as never,
        listAttachments: async () => [],
        deleteActivity: async () => true,
      }),
      overrides: {
        deleteUnreferencedUploads: async () => {
          throw new Error("R2 unavailable");
        },
      },
    });

    const response = await app.request(`/api/activities/${ACTIVITY_ID}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(204);
  });
});
