import {
  type PresignPath,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";

export type UploadedCover = { file: File; url: string };

/**
 * 대표 사진을 올리고 결과를 `cacheRef`에 기억한다.
 * 같은 파일로 다시 저장하면 R2에 또 올리지 않고 기억해 둔 주소를 돌려준다.
 */
export const uploadCoverOnce = async (input: {
  cacheRef: { current: UploadedCover | null };
  file: File;
  presignPath: PresignPath;
  onProgress: (progressPercent: number) => void;
}): Promise<string> => {
  const uploadedCover = input.cacheRef.current;
  if (uploadedCover?.file === input.file) {
    input.onProgress(100);
    return uploadedCover.url;
  }

  const url = await uploadWithPresign({
    presignPath: input.presignPath,
    file: input.file,
    onProgress: input.onProgress,
  });
  input.cacheRef.current = { file: input.file, url };
  return url;
};
