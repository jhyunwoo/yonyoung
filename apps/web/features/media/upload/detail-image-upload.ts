import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import type { PresignPath } from "@/features/dashboard/api/admin-api/upload";
import { readImageDimensions } from "@/features/media/images/read-image-dimensions";
import type { UploadImageItem } from "@/features/media/upload/image-upload-state";

export type UploadedDetailImage = {
  imageUrl: string;
  sortOrder: number;
  width?: number;
  height?: number;
};

export type NewUploadImageItem = UploadImageItem & { file: File };

/** 아직 업로드되지 않은(=새로 고른) 항목만 추린다. */
export const readNewUploadImageItems = (
  items: readonly UploadImageItem[],
): NewUploadImageItem[] =>
  items.filter((item): item is NewUploadImageItem => item.file !== null);

/**
 * 세부 이미지를 업로드하고 저장용 payload로 변환한다.
 *
 * 업로드 전에 원본 픽셀 크기를 측정해 함께 저장한다. 공개 갤러리가 justified rows
 * 레이아웃을 그리려면 서버가 각 사진의 비율을 알고 있어야 하기 때문이다.
 * HEIC처럼 측정에 실패하는 형식은 크기 없이 저장한다.
 */
export const uploadDetailImages = async (input: {
  presignPath: PresignPath;
  items: readonly NewUploadImageItem[];
  startSortOrder?: number;
  onProgress?: (progressPercent: number) => void;
}): Promise<UploadedDetailImage[]> => {
  if (input.items.length === 0) {
    return [];
  }

  const dimensionList = await Promise.all(
    input.items.map((item) => readImageDimensions(item.file)),
  );

  const uploadedUrls = await uploadFilesWithPresign({
    presignPath: input.presignPath,
    files: input.items.map((item) => item.file),
    onProgress: input.onProgress,
  });

  const startSortOrder = input.startSortOrder ?? 0;
  return uploadedUrls.map((imageUrl, index) => ({
    imageUrl,
    sortOrder: startSortOrder + index,
    ...(dimensionList[index] ?? {}),
  }));
};
