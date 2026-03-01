import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "./types";
import { PRESIGN_PATHS, uploadWithPresign } from "./upload";

const adminRequestMock = vi.fn();

vi.mock("./http", () => ({
  adminRequest: (...args: unknown[]) => adminRequestMock(...args),
}));

type PresignResponse = {
  uploadUrl: string;
  publicUrl: string;
  requiredHeaders?: Record<string, string>;
};

const createPresign = (
  overrides: Partial<PresignResponse> = {},
): PresignResponse => ({
  uploadUrl: "https://upload.example.com/object",
  publicUrl: "https://cdn.example.com/object",
  requiredHeaders: {
    "x-amz-acl": "private",
  },
  ...overrides,
});

describe("uploadWithPresign", () => {
  const originalFetch = globalThis.fetch;
  const originalXhr = globalThis.XMLHttpRequest;

  beforeEach(() => {
    adminRequestMock.mockReset();
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.XMLHttpRequest = originalXhr;
    vi.restoreAllMocks();
  });

  it("presign 요청 후 fetch 업로드를 수행하고 publicUrl을 반환한다", async () => {
    adminRequestMock.mockResolvedValue(createPresign());
    const file = new File(["a"], "cover.png", { type: "image/png" });

    const result = await uploadWithPresign({
      presignPath: PRESIGN_PATHS.activityCover,
      file,
    });

    expect(result).toBe("https://cdn.example.com/object");
    expect(adminRequestMock).toHaveBeenCalledWith(
      PRESIGN_PATHS.activityCover,
      "POST",
      {
        fileName: "cover.png",
        contentType: "image/png",
        fileSize: file.size,
      },
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://upload.example.com/object",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "x-amz-acl": "private",
          "Content-Type": "image/png",
        }),
        body: file,
      }),
    );
  });

  it("파일 타입이 비어있으면 확장자로 content-type을 추론한다", async () => {
    adminRequestMock.mockResolvedValue(createPresign({ requiredHeaders: {} }));
    const file = new File(["a"], "detail.webp");

    await uploadWithPresign({
      presignPath: PRESIGN_PATHS.activityDetail,
      file,
    });

    expect(adminRequestMock).toHaveBeenCalledWith(
      PRESIGN_PATHS.activityDetail,
      "POST",
      expect.objectContaining({
        contentType: "image/webp",
      }),
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "image/webp",
        }),
      }),
    );
  });

  it("진행률 콜백이 있으면 XMLHttpRequest 경로를 사용한다", async () => {
    adminRequestMock.mockResolvedValue(
      createPresign({
        requiredHeaders: { "Content-Type": "image/jpeg" },
      }),
    );

    class MockXhr {
      public status = 200;
      public upload: { onprogress: ((event: ProgressEvent<EventTarget>) => void) | null } = {
        onprogress: null,
      };
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;

      open() {}
      setRequestHeader() {}
      send() {
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: 5,
          total: 10,
        } as ProgressEvent<EventTarget>);
        this.onload?.();
      }
      withCredentials = false;
    }

    globalThis.XMLHttpRequest = MockXhr as unknown as typeof XMLHttpRequest;
    const progressHistory: number[] = [];

    const result = await uploadWithPresign({
      presignPath: PRESIGN_PATHS.noticeImage,
      file: new File(["a"], "notice.jpg", { type: "image/jpeg" }),
      onProgress: (percent) => progressHistory.push(percent),
    });

    expect(result).toBe("https://cdn.example.com/object");
    expect(progressHistory).toEqual([0, 50, 100]);
  });

  it("fetch 업로드 실패를 AdminApiError로 매핑한다", async () => {
    adminRequestMock.mockResolvedValue(createPresign());
    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 500 })) as typeof fetch;

    await expect(
      uploadWithPresign({
        presignPath: PRESIGN_PATHS.exhibitionCover,
        file: new File(["a"], "cover.jpg", { type: "image/jpeg" }),
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AdminApiError>>({
        message: "파일 업로드에 실패했습니다.",
      }),
    );
  });

  it("marketImage presign 경로로도 업로드를 수행한다", async () => {
    adminRequestMock.mockResolvedValue(createPresign());
    const file = new File(["a"], "market.jpg", { type: "image/jpeg" });

    await uploadWithPresign({
      presignPath: PRESIGN_PATHS.marketImage,
      file,
    });

    expect(adminRequestMock).toHaveBeenCalledWith(
      PRESIGN_PATHS.marketImage,
      "POST",
      expect.objectContaining({
        fileName: "market.jpg",
        contentType: "image/jpeg",
      }),
    );
  });
});
