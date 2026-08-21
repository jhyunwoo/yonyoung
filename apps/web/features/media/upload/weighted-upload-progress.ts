/**
 * 대표 이미지와 세부 이미지 N장을 함께 올릴 때의 전체 진행률.
 *
 * 두 업로드는 각자 0~100으로 보고하므로, 장수를 가중치로 삼아 하나의 값으로 합친다.
 * 수정 화면에서는 대표 이미지를 바꾸지 않을 수 있으므로 대표 몫을 뺄 수 있어야 한다.
 * 올릴 것이 하나도 없으면 진행률 자체를 표시하지 않는다(null).
 */
export const calculateWeightedUploadProgress = (input: {
  coverProgressPercent: number;
  detailProgressPercent: number;
  detailCount: number;
  hasCover?: boolean;
}): number | null => {
  const hasCover = input.hasCover ?? true;
  const totalCount = (hasCover ? 1 : 0) + input.detailCount;
  if (totalCount <= 0) {
    return null;
  }

  const weightedCover = hasCover ? input.coverProgressPercent : 0;
  const weighted =
    (weightedCover + input.detailProgressPercent * input.detailCount) / totalCount;

  return Math.round(weighted);
};

export type WeightedUploadProgressTracker = {
  reportCoverProgress: (progressPercent: number) => void;
  reportDetailProgress: (progressPercent: number) => void;
};

/**
 * 두 업로드의 진행률을 모아 한 번에 하나의 값으로 보고하는 트래커.
 * 어느 쪽이 먼저 보고하든 마지막으로 알려진 값끼리 합산한다.
 */
export const createWeightedUploadProgressTracker = (input: {
  detailCount: number;
  hasCover?: boolean;
  onProgress: (progressPercent: number | null) => void;
}): WeightedUploadProgressTracker => {
  let coverProgressPercent = 0;
  let detailProgressPercent = 0;

  const publish = () => {
    input.onProgress(
      calculateWeightedUploadProgress({
        coverProgressPercent,
        detailProgressPercent,
        detailCount: input.detailCount,
        hasCover: input.hasCover,
      }),
    );
  };

  return {
    reportCoverProgress: (progressPercent) => {
      coverProgressPercent = progressPercent;
      publish();
    },
    reportDetailProgress: (progressPercent) => {
      detailProgressPercent = progressPercent;
      publish();
    },
  };
};
