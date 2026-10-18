"use client";

import { type ChangeEvent, useCallback, useRef, useState } from "react";
import {
  createExistingUploadImageItem,
  readFileList,
  type UploadImageItem,
} from "@/features/media/upload/image-upload-state";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";

/** 정렬은 서버 응답 순서에 의존하지 않고 sortOrder로 다시 고정한다. */
export const toSortedDetailImageItems = (
  detailImages: ReadonlyArray<{ id: string; imageUrl: string; sortOrder: number }>,
): UploadImageItem[] =>
  detailImages
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image) =>
      createExistingUploadImageItem({
        id: image.id,
        imageUrl: image.imageUrl,
      }),
    );

/**
 * 활동·전시 폼의 세부 사진 목록 상태.
 * 수정 폼에서 지운 기존 사진 id는 저장할 때 서버에서도 지우도록 따로 모아 둔다.
 */
export const useDetailImageField = (initialItems?: () => UploadImageItem[]) => {
  const { items, appendFiles, removeItemById, reorderByIds, markItemsPersisted } =
    useImageUploadState({ initialItems });
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onFilesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = readFileList(event.target.files);
      event.target.value = "";
      appendFiles(files);
    },
    [appendFiles],
  );

  const remove = useCallback(
    (imageId: string) => {
      const targetExistingId = items.find(
        (image) => image.id === imageId && image.source === "existing",
      )?.id;
      removeItemById(imageId);
      if (targetExistingId) {
        setDeletedImageIds((previous) =>
          previous.includes(targetExistingId)
            ? previous
            : [...previous, targetExistingId],
        );
      }
    },
    [items, removeItemById],
  );

  const reorder = useCallback(
    (nextItems: ReadonlyArray<{ id: string }>) => {
      reorderByIds(nextItems.map((item) => item.id));
    },
    [reorderByIds],
  );

  /** 서버에서 삭제가 끝난 id를 목록에서 뺀다. 다시 저장할 때 같은 삭제를 반복하지 않는다. */
  const forgetDeletedImageIds = useCallback((imageIds: string[]) => {
    setDeletedImageIds((previous) => previous.filter((id) => !imageIds.includes(id)));
  }, []);

  return {
    items,
    inputRef,
    openPicker,
    onFilesChange,
    remove,
    reorder,
    deletedImageIds,
    forgetDeletedImageIds,
    markItemsPersisted,
  };
};

export type DetailImageField = ReturnType<typeof useDetailImageField>;
