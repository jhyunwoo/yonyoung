import { describe, expect, it, vi } from "vitest";
import {
  calculateWeightedUploadProgress,
  createWeightedUploadProgressTracker,
} from "@/features/media/upload/weighted-upload-progress";

describe("weighted upload progress", () => {
  it("대표 이미지만 올릴 때는 대표 진행률이 곧 전체 진행률이다", () => {
    expect(
      calculateWeightedUploadProgress({
        coverProgressPercent: 40,
        detailProgressPercent: 0,
        detailCount: 0,
      }),
    ).toBe(40);
  });

  it("세부 이미지 장수만큼 가중치를 준다", () => {
    // 대표 1장(100%) + 세부 3장(0%) => 100 / 4 = 25
    expect(
      calculateWeightedUploadProgress({
        coverProgressPercent: 100,
        detailProgressPercent: 0,
        detailCount: 3,
      }),
    ).toBe(25);
  });

  it("양쪽이 모두 끝나면 100이 된다", () => {
    expect(
      calculateWeightedUploadProgress({
        coverProgressPercent: 100,
        detailProgressPercent: 100,
        detailCount: 5,
      }),
    ).toBe(100);
  });

  it("소수점은 반올림한다", () => {
    // (0 + 50 * 3) / 4 = 37.5 -> 38
    expect(
      calculateWeightedUploadProgress({
        coverProgressPercent: 0,
        detailProgressPercent: 50,
        detailCount: 3,
      }),
    ).toBe(38);
  });

  it("대표 이미지를 바꾸지 않으면 대표 몫을 빼고 계산한다", () => {
    expect(
      calculateWeightedUploadProgress({
        coverProgressPercent: 100,
        detailProgressPercent: 50,
        detailCount: 2,
        hasCover: false,
      }),
    ).toBe(50);
  });

  it("올릴 것이 하나도 없으면 진행률을 표시하지 않는다", () => {
    expect(
      calculateWeightedUploadProgress({
        coverProgressPercent: 0,
        detailProgressPercent: 0,
        detailCount: 0,
        hasCover: false,
      }),
    ).toBeNull();
  });
});

describe("weighted upload progress tracker", () => {
  it("어느 쪽이 먼저 보고하든 마지막 값끼리 합산해서 알린다", () => {
    const onProgress = vi.fn();
    const tracker = createWeightedUploadProgressTracker({
      detailCount: 1,
      onProgress,
    });

    tracker.reportDetailProgress(100);
    expect(onProgress).toHaveBeenLastCalledWith(50);

    tracker.reportCoverProgress(100);
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it("대표 이미지가 없으면 세부 진행률만으로 보고한다", () => {
    const onProgress = vi.fn();
    const tracker = createWeightedUploadProgressTracker({
      detailCount: 2,
      hasCover: false,
      onProgress,
    });

    tracker.reportDetailProgress(30);
    expect(onProgress).toHaveBeenLastCalledWith(30);
  });
});
