import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as UploadModule from "@/features/dashboard/api/admin-api/upload";

const uploadWithPresignMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/dashboard/api/admin-api/upload", async (importOriginal) => {
  const actual = await importOriginal<typeof UploadModule>();
  return { ...actual, uploadWithPresign: uploadWithPresignMock };
});

import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import {
  type UploadedCover,
  uploadCoverOnce,
} from "@/features/media/upload/upload-cover-once";

const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" });

describe("uploadCoverOnce", () => {
  beforeEach(() => {
    uploadWithPresignMock.mockReset();
  });

  it("처음 고른 파일은 올리고 결과를 기억한다", async () => {
    uploadWithPresignMock.mockResolvedValue("https://cdn.example.com/cover.jpg");
    const cacheRef: { current: UploadedCover | null } = { current: null };
    const onProgress = vi.fn();

    const url = await uploadCoverOnce({
      cacheRef,
      file: coverFile,
      presignPath: PRESIGN_PATHS.activityCover,
      onProgress,
    });

    expect(url).toBe("https://cdn.example.com/cover.jpg");
    expect(uploadWithPresignMock).toHaveBeenCalledWith({
      presignPath: PRESIGN_PATHS.activityCover,
      file: coverFile,
      onProgress,
    });
    expect(cacheRef.current).toEqual({
      file: coverFile,
      url: "https://cdn.example.com/cover.jpg",
    });
  });

  it("같은 파일로 다시 저장하면 올리지 않고 진행률을 100으로 채운다", async () => {
    const cacheRef = {
      current: { file: coverFile, url: "https://cdn.example.com/a.jpg" },
    };
    const onProgress = vi.fn();

    const url = await uploadCoverOnce({
      cacheRef,
      file: coverFile,
      presignPath: PRESIGN_PATHS.exhibitionCover,
      onProgress,
    });

    expect(url).toBe("https://cdn.example.com/a.jpg");
    expect(onProgress).toHaveBeenCalledWith(100);
    expect(uploadWithPresignMock).not.toHaveBeenCalled();
  });

  it("다른 파일을 고르면 새로 올리고 기억을 바꾼다", async () => {
    uploadWithPresignMock.mockResolvedValue("https://cdn.example.com/b.jpg");
    const otherFile = new File(["other"], "other.jpg", { type: "image/jpeg" });
    const cacheRef = {
      current: { file: coverFile, url: "https://cdn.example.com/a.jpg" },
    };

    const url = await uploadCoverOnce({
      cacheRef,
      file: otherFile,
      presignPath: PRESIGN_PATHS.activityCover,
      onProgress: vi.fn(),
    });

    expect(url).toBe("https://cdn.example.com/b.jpg");
    expect(cacheRef.current).toEqual({
      file: otherFile,
      url: "https://cdn.example.com/b.jpg",
    });
  });
});
