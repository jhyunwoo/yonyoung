import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./http", () => ({
  adminRequest: vi.fn(),
}));

import { adminRequest } from "./http";
import { AdminApiError } from "./types";
import { PRESIGN_PATHS, resolveImageValue, uploadWithPresign } from "./upload";

describe("upload helpers", () => {
  const mockAdminRequest = vi.mocked(adminRequest);

  beforeEach(() => {
    mockAdminRequest.mockReset();
    mockAdminRequest.mockResolvedValue({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "uploads/object-key",
      publicUrl: "https://cdn.example.com/public-url",
      requiredHeaders: {
        "Content-Type": "image/png",
      },
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploadWithPresign은 presign 요청 후 PUT 업로드를 수행하고 publicUrl을 반환한다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "photo.png", { type: "image/png" });
    const publicUrl = await uploadWithPresign({
      presignPath: PRESIGN_PATHS.activityCover,
      file,
    });

    expect(publicUrl).toBe("https://cdn.example.com/public-url");
    expect(mockAdminRequest).toHaveBeenCalledWith(PRESIGN_PATHS.activityCover, "POST", {
      fileName: "photo.png",
      contentType: "image/png",
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("PUT");
    expect((options.body as File).name).toBe("photo.png");
    expect((options.headers as Headers).get("Content-Type")).toBe("image/png");
  });

  it("file.type이 비어 있으면 확장자로 MIME 타입을 추론한다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    mockAdminRequest.mockResolvedValueOnce({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "uploads/object-key",
      publicUrl: "https://cdn.example.com/public-url",
      requiredHeaders: undefined,
    } as never);

    const file = new File(["hello"], "photo.gif");
    await uploadWithPresign({
      presignPath: PRESIGN_PATHS.supporterLogo,
      file,
    });

    expect(mockAdminRequest).toHaveBeenCalledWith(PRESIGN_PATHS.supporterLogo, "POST", {
      fileName: "photo.gif",
      contentType: "image/gif",
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Headers).get("Content-Type")).toBe("image/gif");
  });

  it("알 수 없는 확장자(file.type 없음)는 image/jpeg로 처리한다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    mockAdminRequest.mockResolvedValueOnce({
      uploadUrl: "https://upload.example.com/signed",
      objectKey: "uploads/object-key",
      publicUrl: "https://cdn.example.com/public-url",
      requiredHeaders: undefined,
    } as never);

    const file = new File(["hello"], "photo.unknown");
    await uploadWithPresign({
      presignPath: PRESIGN_PATHS.exhibitionDetail,
      file,
    });

    expect(mockAdminRequest).toHaveBeenCalledWith(PRESIGN_PATHS.exhibitionDetail, "POST", {
      fileName: "photo.unknown",
      contentType: "image/jpeg",
    });
  });

  it("업로드가 실패하면 AdminApiError(UPLOAD_FAILED)를 던진다", async () => {
    const fetchMock = vi.fn(async () => new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "photo.png", { type: "image/png" });

    await expect(
      uploadWithPresign({
        presignPath: PRESIGN_PATHS.activityDetail,
        file,
      }),
    ).rejects.toMatchObject({
      name: "AdminApiError",
      status: 403,
      code: "UPLOAD_FAILED",
      message: "파일 업로드에 실패했습니다.",
    });
  });

  it("resolveImageValue(url 모드)는 trim된 URL을 반환한다", async () => {
    const result = await resolveImageValue({
      mode: "url",
      urlValue: "  https://example.com/image.jpg  ",
      file: null,
      presignPath: PRESIGN_PATHS.activityCover,
      fieldLabel: "대표 이미지",
    });

    expect(result).toBe("https://example.com/image.jpg");
  });

  it("resolveImageValue(url 모드)에서 빈 URL은 오류를 던진다", async () => {
    await expect(
      resolveImageValue({
        mode: "url",
        urlValue: "   ",
        file: null,
        presignPath: PRESIGN_PATHS.activityCover,
        fieldLabel: "대표 이미지",
      }),
    ).rejects.toThrow("대표 이미지 URL을 입력해 주세요.");
  });

  it("resolveImageValue(file 모드)에서 파일이 없으면 오류를 던진다", async () => {
    await expect(
      resolveImageValue({
        mode: "file",
        urlValue: "",
        file: null,
        presignPath: PRESIGN_PATHS.userProfile,
        fieldLabel: "프로필 이미지",
      }),
    ).rejects.toThrow("프로필 이미지 파일을 선택해 주세요.");
  });

  it("resolveImageValue(file 모드)는 업로드 후 public URL을 반환한다", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "profile.webp", { type: "image/webp" });
    const result = await resolveImageValue({
      mode: "file",
      urlValue: "",
      file,
      presignPath: PRESIGN_PATHS.userProfile,
      fieldLabel: "프로필 이미지",
    });

    expect(result).toBe("https://cdn.example.com/public-url");
    expect(mockAdminRequest).toHaveBeenCalledWith(PRESIGN_PATHS.userProfile, "POST", {
      fileName: "profile.webp",
      contentType: "image/webp",
    });
  });

  it("upload 실패 오류는 AdminApiError 타입으로 유지된다", async () => {
    const fetchMock = vi.fn(async () => new Response("error", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["hello"], "photo.png", { type: "image/png" });

    try {
      await uploadWithPresign({
        presignPath: PRESIGN_PATHS.activityCover,
        file,
      });
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(AdminApiError);
    }
  });
});
