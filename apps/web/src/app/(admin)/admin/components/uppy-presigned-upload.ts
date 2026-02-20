"use client";

import Uppy from "@uppy/core";
import { adminRequest } from "../../../../lib/admin-api/http";
import type { ApiPresignResponse } from "../../../../lib/admin-api/types";
import type { PresignPath } from "../../../../lib/admin-api/upload";

const defaultContentType = (file: File): string => {
  if (file.type && file.type.startsWith("image/")) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) {
    return "image/png";
  }
  if (name.endsWith(".webp")) {
    return "image/webp";
  }
  if (name.endsWith(".gif")) {
    return "image/gif";
  }
  return "image/jpeg";
};

const resolveUploadHeaders = (
  requiredHeaders: ApiPresignResponse["requiredHeaders"] | undefined,
  fallbackContentType: string,
): Record<string, string> => {
  const resolved: Record<string, string> = {};
  let hasContentTypeHeader = false;

  if (requiredHeaders) {
    for (const [key, value] of Object.entries(requiredHeaders)) {
      if (!value) {
        continue;
      }
      resolved[key] = value;
      if (key.toLowerCase() === "content-type") {
        hasContentTypeHeader = true;
      }
    }
  }

  if (!hasContentTypeHeader) {
    resolved["Content-Type"] = fallbackContentType;
  }

  return resolved;
};

const uploadViaFetch = async (
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
) => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    mode: "cors",
    credentials: "omit",
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error("파일 업로드에 실패했습니다.");
  }
};

const uploadViaXhr = async (
  uploadUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.withCredentials = false;

    for (const [key, value] of Object.entries(headers)) {
      request.setRequestHeader(key, value);
    }

    request.upload.onprogress = (event) => {
      const total = event.total > 0 ? event.total : file.size;
      if (total <= 0) {
        return;
      }
      const value = Math.round((event.loaded / total) * 100);
      onProgress(Math.max(0, Math.min(100, value)));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error("파일 업로드에 실패했습니다."));
    };

    request.onerror = () => {
      reject(new Error("파일 업로드에 실패했습니다."));
    };

    request.send(file);
  });

export const createUppyPresignedUploader = (presignPath: PresignPath) => {
  const publicUrlByFileId = new Map<string, string>();

  const uppy = new Uppy({
    autoProceed: true,
    allowMultipleUploadBatches: true,
    restrictions: {
      allowedFileTypes: ["image/*"],
    },
  });

  const emitUppyEvent = (eventName: string, ...args: unknown[]) => {
    const emit = uppy.emit as unknown as (
      name: string,
      ...payload: unknown[]
    ) => void;
    emit.call(uppy, eventName, ...args);
  };

  uppy.addUploader(async (fileIDs) => {
    const uploadFile = async (fileId: string) => {
      const file = uppy.getFile(fileId);
      if (!file || !(file.data instanceof File)) {
        return;
      }

      const sourceFile = file.data;
      try {
        emitUppyEvent("upload-started", file);
        const contentType = defaultContentType(sourceFile);
        const presign = await adminRequest<ApiPresignResponse>(presignPath, "POST", {
          fileName: sourceFile.name,
          contentType,
        });
        publicUrlByFileId.set(file.id, presign.publicUrl);
        const headers = resolveUploadHeaders(presign.requiredHeaders, contentType);

        const emitProgress = (percent: number) => {
          const bytesTotal = sourceFile.size || 0;
          const bytesUploaded = Math.round((bytesTotal * percent) / 100);
          emitUppyEvent("upload-progress", file, {
            uploader: "presigned",
            bytesTotal,
            bytesUploaded,
            uploadComplete: percent >= 100,
          });
        };

        emitProgress(0);
        if (typeof XMLHttpRequest !== "undefined") {
          await uploadViaXhr(presign.uploadUrl, sourceFile, headers, emitProgress);
        } else {
          await uploadViaFetch(presign.uploadUrl, sourceFile, headers);
        }
        emitProgress(100);

        emitUppyEvent("upload-success", file, {
          status: 200,
          uploadURL: presign.publicUrl,
        });
      } catch (error) {
        const normalizedError =
          error instanceof Error ? error : new Error("이미지 업로드에 실패했습니다.");
        emitUppyEvent("upload-error", file, normalizedError);
      }
    };

    await Promise.all(fileIDs.map((fileId) => uploadFile(fileId)));
  });

  return {
    uppy,
    getPublicUrl(fileId: string): string | null {
      return publicUrlByFileId.get(fileId) ?? null;
    },
    clearFile(fileId: string): void {
      publicUrlByFileId.delete(fileId);
    },
    clearAll(): void {
      publicUrlByFileId.clear();
      for (const file of uppy.getFiles()) {
        uppy.removeFile(file.id);
      }
    },
    destroy(): void {
      publicUrlByFileId.clear();
      uppy.destroy();
    },
  };
};
