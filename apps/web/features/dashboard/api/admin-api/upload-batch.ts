import {
  type PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import { mapWithConcurrency } from "@/shared/utils/map-with-concurrency";

/**
 * 동시에 진행하는 업로드 수.
 * API는 관리자 1명당 동시 업로드 예약을 10건으로 제한한다(`upload-reservation.ts`). 한 번에
 * 전부 presign 하면 11번째부터 409로 저장 전체가 실패하므로, "presign → PUT → 정산"을 끝낸
 * 슬롯만 다음 파일에 재사용하도록 한도보다 충분히 작게 둔다.
 */
export const UPLOAD_BATCH_CONCURRENCY = 4;

type PresignPath = (typeof PRESIGN_PATHS)[keyof typeof PRESIGN_PATHS];

const clampProgress = (progress: number): number => {
  if (!Number.isFinite(progress)) {
    return 0;
  }

  if (progress < 0) {
    return 0;
  }
  if (progress > 100) {
    return 100;
  }

  return Math.round(progress);
};

export const uploadFilesWithPresign = async (input: {
  presignPath: PresignPath;
  files: File[];
  onProgress?: (progressPercent: number) => void;
}): Promise<string[]> => {
  if (input.files.length === 0) {
    return [];
  }

  if (input.onProgress) {
    input.onProgress(0);
  }

  const progressByFile = new Array<number>(input.files.length).fill(0);
  const emitProgress = () => {
    if (!input.onProgress) {
      return;
    }

    const totalProgress = progressByFile.reduce((sum, value) => sum + value, 0);
    const averageProgress = totalProgress / input.files.length;
    input.onProgress(clampProgress(averageProgress));
  };

  // API는 관리자 1명당 동시 업로드 예약을 10건으로 제한한다(`upload-reservation.ts`).
  // 한 번에 전부 presign 하면 11번째부터 409로 저장 전체가 실패하므로, 작은 작업자 풀로
  // "presign → PUT → 정산"을 끝낸 슬롯만 다음 파일에 재사용한다.
  const uploadedUrls = await mapWithConcurrency(
    input.files,
    UPLOAD_BATCH_CONCURRENCY,
    (file, index) =>
      uploadWithPresign({
        presignPath: input.presignPath,
        file,
        onProgress: input.onProgress
          ? (progressPercent) => {
              progressByFile[index] = clampProgress(progressPercent);
              emitProgress();
            }
          : undefined,
      }),
  );

  if (input.onProgress) {
    input.onProgress(100);
  }

  return uploadedUrls;
};
