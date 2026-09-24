import type { PresignPath } from "@/features/dashboard/api/admin-api/upload";
import {
  readNewUploadImageItems,
  uploadDetailImages,
  type UploadedDetailImage,
} from "@/features/media/upload/detail-image-upload";
import type { UploadImageItem } from "@/features/media/upload/image-upload-state";
import { AdminApiError } from "@/shared/http/http";

export type DetailImageSyncApi = {
  deleteImage: (imageId: string) => Promise<unknown>;
  addImages: (images: UploadedDetailImage[]) => Promise<ReadonlyArray<{ id: string }>>;
  reorderImages: (items: { imageId: string; sortOrder: number }[]) => Promise<unknown>;
};

export type PersistedDetailImage = { id: string; imageUrl: string };

const isAlreadyDeleted = (error: unknown): boolean =>
  error instanceof AdminApiError && error.status === 404;

/**
 * 편집 폼의 세부 이미지 변경(삭제 → 새 사진 업로드·등록 → 순서 저장)을 서버에 반영한다.
 *
 * 저장은 여러 요청으로 나뉘어 중간에 실패할 수 있다. 각 단계가 성공하는 즉시 콜백으로
 * 알려 폼이 로컬 상태에 확정해 두면, 다시 저장했을 때 이미 끝난 단계를 반복하지 않는다.
 * - 이미 지운 이미지를 다시 지우려다 404로 막히지 않는다 (404는 삭제 완료로 본다).
 * - 이미 등록한 새 사진을 두 번 등록(중복)하지 않는다.
 * - 업로드는 끝났지만 등록이 실패한 파일은 `uploadCache`로 재사용해 R2에 다시 올리지 않는다.
 *
 * 활동·전시의 저장 흐름 자체는 각 폼이 소유하고, 이 함수는 세부 이미지 동기화만 맡는다.
 */
export const syncDetailImages = async (input: {
  presignPath: PresignPath;
  items: readonly UploadImageItem[];
  deletedImageIds: readonly string[];
  uploadCache: Map<string, UploadedDetailImage>;
  api: DetailImageSyncApi;
  onProgress?: (progressPercent: number) => void;
  onImagesDeleted: (imageIds: string[]) => void;
  onImagesPersisted: (persisted: Map<string, PersistedDetailImage>) => void;
}): Promise<void> => {
  if (input.deletedImageIds.length > 0) {
    const results = await Promise.allSettled(
      input.deletedImageIds.map(async (imageId) => {
        try {
          await input.api.deleteImage(imageId);
        } catch (error) {
          if (!isAlreadyDeleted(error)) {
            throw error;
          }
        }
        return imageId;
      }),
    );
    const deletedIds = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    if (deletedIds.length > 0) {
      input.onImagesDeleted(deletedIds);
    }
    const failure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) {
      throw failure.reason;
    }
  }

  const existingCount = input.items.filter((item) => item.source === "existing").length;
  const newItems = readNewUploadImageItems(input.items);
  const persisted = new Map<string, PersistedDetailImage>();

  if (newItems.length > 0) {
    const itemsToUpload = newItems.filter((item) => !input.uploadCache.has(item.id));
    if (itemsToUpload.length > 0) {
      const uploaded = await uploadDetailImages({
        presignPath: input.presignPath,
        items: itemsToUpload,
        onProgress: input.onProgress,
      });
      itemsToUpload.forEach((item, index) => {
        const image = uploaded[index];
        if (image) {
          input.uploadCache.set(item.id, image);
        }
      });
    } else {
      input.onProgress?.(100);
    }

    const payload = newItems.map((item, index): UploadedDetailImage => {
      const cached = input.uploadCache.get(item.id);
      if (!cached) {
        throw new Error("업로드된 세부 이미지 정보를 찾지 못했습니다.");
      }
      return { ...cached, sortOrder: existingCount + index };
    });

    const created = await input.api.addImages(payload);
    newItems.forEach((item, index) => {
      const row = created[index];
      const image = payload[index];
      if (row && image) {
        persisted.set(item.id, { id: row.id, imageUrl: image.imageUrl });
        input.uploadCache.delete(item.id);
      }
    });
    input.onImagesPersisted(persisted);
  }

  // 새 사진만 남았다면 addImages가 이미 순서대로 sortOrder를 매겼다.
  if (existingCount === 0) {
    return;
  }

  const finalOrder = input.items
    .map((item) => (item.source === "existing" ? item.id : persisted.get(item.id)?.id))
    .filter((id): id is string => typeof id === "string");
  if (finalOrder.length > 0) {
    await input.api.reorderImages(
      finalOrder.map((imageId, sortOrder) => ({ imageId, sortOrder })),
    );
  }
};
