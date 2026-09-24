import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/shared/http/http";
import type { UploadImageItem } from "@/features/media/upload/image-upload-state";
import type * as DetailImageUploadModule from "@/features/media/upload/detail-image-upload";
import type { UploadedDetailImage } from "@/features/media/upload/detail-image-upload";

const uploadDetailImagesMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/media/upload/detail-image-upload", async (importOriginal) => {
  const actual = await importOriginal<typeof DetailImageUploadModule>();
  return { ...actual, uploadDetailImages: uploadDetailImagesMock };
});

import { syncDetailImages } from "@/features/media/upload/detail-image-sync";

const existing = (id: string): UploadImageItem => ({
  id,
  imageUrl: `https://cdn.example.com/${id}.jpg`,
  source: "existing",
  file: null,
});
const fresh = (id: string): UploadImageItem => ({
  id,
  imageUrl: `blob:${id}`,
  source: "new",
  file: new File([id], `${id}.jpg`, { type: "image/jpeg" }),
});

const createApi = () => ({
  deleteImage: vi.fn(async () => undefined),
  addImages: vi.fn(async (images: UploadedDetailImage[]) =>
    images.map((_, index) => ({ id: `server-${index}` })),
  ),
  reorderImages: vi.fn(async () => undefined),
});

describe("syncDetailImages", () => {
  beforeEach(() => {
    uploadDetailImagesMock.mockReset();
    uploadDetailImagesMock.mockImplementation(
      async ({ items }: { items: UploadImageItem[] }) =>
        items.map((item, index) => ({
          imageUrl: `https://cdn.example.com/uploaded-${item.id}.jpg`,
          sortOrder: index,
        })),
    );
  });

  it("삭제 → 추가 → 전체 순서 저장 순으로 반영하고 단계마다 결과를 알린다", async () => {
    const api = createApi();
    const onImagesDeleted = vi.fn();
    const onImagesPersisted = vi.fn();

    await syncDetailImages({
      presignPath: "/activities/presign/detail",
      items: [fresh("n1"), existing("e1")],
      deletedImageIds: ["gone"],
      uploadCache: new Map(),
      api,
      onImagesDeleted,
      onImagesPersisted,
    });

    expect(api.deleteImage).toHaveBeenCalledWith("gone");
    expect(onImagesDeleted).toHaveBeenCalledWith(["gone"]);
    expect(api.addImages).toHaveBeenCalledWith([
      { imageUrl: "https://cdn.example.com/uploaded-n1.jpg", sortOrder: 1 },
    ]);
    expect(onImagesPersisted.mock.calls[0]?.[0]).toEqual(
      new Map([
        ["n1", { id: "server-0", imageUrl: "https://cdn.example.com/uploaded-n1.jpg" }],
      ]),
    );
    expect(api.reorderImages).toHaveBeenCalledWith([
      { imageId: "server-0", sortOrder: 0 },
      { imageId: "e1", sortOrder: 1 },
    ]);
  });

  it("이미 지워진 이미지(404)는 삭제 완료로 본다", async () => {
    const api = createApi();
    api.deleteImage.mockRejectedValueOnce(
      new AdminApiError({ status: 404, code: "NOT_FOUND", message: "없음" }),
    );
    const onImagesDeleted = vi.fn();

    await syncDetailImages({
      presignPath: "/activities/presign/detail",
      items: [existing("e1")],
      deletedImageIds: ["gone"],
      uploadCache: new Map(),
      api,
      onImagesDeleted,
      onImagesPersisted: vi.fn(),
    });

    expect(onImagesDeleted).toHaveBeenCalledWith(["gone"]);
  });

  it("등록이 실패하면 다시 시도할 때 업로드는 재사용하고 등록만 다시 한다", async () => {
    const api = createApi();
    api.addImages.mockRejectedValueOnce(
      new AdminApiError({ status: 500, code: "DB_ERROR", message: "일시 오류" }),
    );
    const uploadCache = new Map<string, UploadedDetailImage>();
    const input = {
      presignPath: "/activities/presign/detail" as const,
      items: [existing("e1"), fresh("n1")],
      deletedImageIds: [],
      uploadCache,
      api,
      onImagesDeleted: vi.fn(),
      onImagesPersisted: vi.fn(),
    };

    await expect(syncDetailImages(input)).rejects.toBeInstanceOf(AdminApiError);
    expect(uploadDetailImagesMock).toHaveBeenCalledTimes(1);
    expect(api.reorderImages).not.toHaveBeenCalled();

    await syncDetailImages(input);

    expect(uploadDetailImagesMock).toHaveBeenCalledTimes(1);
    expect(api.addImages).toHaveBeenCalledTimes(2);
    expect(uploadCache.size).toBe(0);
  });

  it("삭제가 일부 실패하면 성공한 삭제만 확정하고 오류를 전달한다", async () => {
    const api = createApi();
    api.deleteImage.mockImplementation(async (imageId: string) => {
      if (imageId === "bad") {
        throw new AdminApiError({ status: 500, code: "DB_ERROR", message: "실패" });
      }
    });
    const onImagesDeleted = vi.fn();

    await expect(
      syncDetailImages({
        presignPath: "/activities/presign/detail",
        items: [],
        deletedImageIds: ["ok", "bad"],
        uploadCache: new Map(),
        api,
        onImagesDeleted,
        onImagesPersisted: vi.fn(),
      }),
    ).rejects.toMatchObject({ status: 500 });
    expect(onImagesDeleted).toHaveBeenCalledWith(["ok"]);
    expect(api.addImages).not.toHaveBeenCalled();
  });

  it("새 사진만 있으면 순서 저장 요청을 보내지 않는다", async () => {
    const api = createApi();

    await syncDetailImages({
      presignPath: "/activities/presign/detail",
      items: [fresh("n1"), fresh("n2")],
      deletedImageIds: [],
      uploadCache: new Map(),
      api,
      onImagesDeleted: vi.fn(),
      onImagesPersisted: vi.fn(),
    });

    expect(api.addImages).toHaveBeenCalledWith([
      expect.objectContaining({ sortOrder: 0 }),
      expect.objectContaining({ sortOrder: 1 }),
    ]);
    expect(api.reorderImages).not.toHaveBeenCalled();
  });
});
