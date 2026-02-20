import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/admin-api/http", () => ({
  adminRequest: vi.fn(),
}));

import { adminRequest } from "../../../../lib/admin-api/http";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import { createUppyPresignedUploader } from "./uppy-presigned-upload";

describe("uppy presigned uploader", () => {
  const mockAdminRequest = vi.mocked(adminRequest);
  const originalXmlHttpRequest = globalThis.XMLHttpRequest;
  const createDeferred = <T,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  beforeEach(() => {
    mockAdminRequest.mockReset();
    vi.stubGlobal("XMLHttpRequest", undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("XMLHttpRequest", originalXmlHttpRequest);
  });

  it("여러 파일 추가 시 각 파일을 presign/PUT 업로드하고 public URL을 저장한다", async () => {
    let sequence = 0;
    mockAdminRequest.mockImplementation(async () => {
      sequence += 1;
      return {
        uploadUrl: `https://upload.example.com/signed-${sequence}`,
        objectKey: `activities/object-${sequence}`,
        publicUrl: `https://cdn.example.com/public-${sequence}`,
        requiredHeaders: {
          "Content-Type": "image/png",
        },
      } as never;
    });

    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const uploader = createUppyPresignedUploader(PRESIGN_PATHS.activityDetail);
    const uploadedFileIds: string[] = [];

    const waitForUploads = new Promise<void>((resolve, reject) => {
      uploader.uppy.on("upload-success", (file) => {
        if (!file) {
          return;
        }
        uploadedFileIds.push(file.id);
        if (uploadedFileIds.length === 2) {
          resolve();
        }
      });
      uploader.uppy.on("upload-error", (_file, error) => {
        reject(error);
      });
    });

    const firstFile = new File(["first"], "detail-1.png", {
      type: "image/png",
    });
    const secondFile = new File(["second"], "detail-2.png", {
      type: "image/png",
    });

    uploader.uppy.addFile({
      name: firstFile.name,
      type: firstFile.type,
      data: firstFile,
    });
    uploader.uppy.addFile({
      name: secondFile.name,
      type: secondFile.type,
      data: secondFile,
    });

    await waitForUploads;

    expect(uploadedFileIds).toHaveLength(2);
    expect(mockAdminRequest).toHaveBeenNthCalledWith(
      1,
      PRESIGN_PATHS.activityDetail,
      "POST",
      {
        fileName: "detail-1.png",
        contentType: "image/png",
        fileSize: firstFile.size,
      },
    );
    expect(mockAdminRequest).toHaveBeenNthCalledWith(
      2,
      PRESIGN_PATHS.activityDetail,
      "POST",
      {
        fileName: "detail-2.png",
        contentType: "image/png",
        fileSize: secondFile.size,
      },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const uploadedUrls = uploadedFileIds.map((fileId) => uploader.getPublicUrl(fileId));
    expect(uploadedUrls).toEqual([
      "https://cdn.example.com/public-1",
      "https://cdn.example.com/public-2",
    ]);

    uploader.destroy();
  });

  it("여러 파일 업로드는 병렬로 시작된다", async () => {
    let sequence = 0;
    mockAdminRequest.mockImplementation(async () => {
      sequence += 1;
      return {
        uploadUrl: `https://upload.example.com/signed-${sequence}`,
        objectKey: `activities/object-${sequence}`,
        publicUrl: `https://cdn.example.com/public-${sequence}`,
        requiredHeaders: {
          "Content-Type": "image/png",
        },
      } as never;
    });

    const firstUpload = createDeferred<Response>();
    const secondUpload = createDeferred<Response>();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("signed-1")) {
        return firstUpload.promise;
      }
      if (url.includes("signed-2")) {
        return secondUpload.promise;
      }
      return Promise.resolve(new Response("unexpected", { status: 500 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const uploader = createUppyPresignedUploader(PRESIGN_PATHS.activityDetail);
    const uploadedFileIds: string[] = [];

    const waitForUploads = new Promise<void>((resolve, reject) => {
      uploader.uppy.on("upload-success", (file) => {
        if (!file) {
          return;
        }
        uploadedFileIds.push(file.id);
        if (uploadedFileIds.length === 2) {
          resolve();
        }
      });
      uploader.uppy.on("upload-error", (_file, error) => {
        reject(error);
      });
    });

    const firstFile = new File(["first"], "detail-1.png", {
      type: "image/png",
    });
    const secondFile = new File(["second"], "detail-2.png", {
      type: "image/png",
    });

    uploader.uppy.addFile({
      name: firstFile.name,
      type: firstFile.type,
      data: firstFile,
    });
    uploader.uppy.addFile({
      name: secondFile.name,
      type: secondFile.type,
      data: secondFile,
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    firstUpload.resolve(new Response(null, { status: 200 }));
    secondUpload.resolve(new Response(null, { status: 200 }));

    await waitForUploads;

    expect(uploadedFileIds).toHaveLength(2);
    uploader.destroy();
  });
});
