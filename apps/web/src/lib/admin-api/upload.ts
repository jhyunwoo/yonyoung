import { AdminApiError } from "./types";
import { adminRequest } from "./http";
import type { ApiPresignResponse } from "./types";

export const PRESIGN_PATHS = {
  activityCover: "/activities/presign/cover",
  activityDetail: "/activities/presign/detail",
  exhibitionCover: "/exhibitions/presign/cover",
  exhibitionDetail: "/exhibitions/presign/detail",
  supporterLogo: "/supporters/presign/logo",
  noticeImage: "/notices/presign/image",
  userProfile: "/users/presign/profile",
} as const;

type PresignPath = (typeof PRESIGN_PATHS)[keyof typeof PRESIGN_PATHS];

type UploadHeaders = Record<string, string>;

const readUploadProgress = (loaded: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }

  const raw = Math.round((loaded / total) * 100);
  if (raw < 0) {
    return 0;
  }
  if (raw > 100) {
    return 100;
  }

  return raw;
};

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
): UploadHeaders => {
  const resolved: UploadHeaders = {};
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

export const uploadWithPresign = async (input: {
  presignPath: PresignPath;
  file: File;
  onProgress?: (progressPercent: number) => void;
}): Promise<string> => {
  const contentType = defaultContentType(input.file);
  const presign = await adminRequest<ApiPresignResponse>(input.presignPath, "POST", {
    fileName: input.file.name,
    contentType,
    fileSize: input.file.size,
  });

  const uploadHeaders = resolveUploadHeaders(presign.requiredHeaders, contentType);

  const runUploadWithFetch = async () => {
    let uploadResponse: Response;
    try {
      uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        mode: "cors",
        credentials: "omit",
        headers: uploadHeaders,
        body: input.file,
      });
    } catch {
      throw new AdminApiError({
        status: 0,
        code: "UPLOAD_FAILED",
        message: "파일 업로드에 실패했습니다.",
      });
    }

    if (!uploadResponse.ok) {
      throw new AdminApiError({
        status: uploadResponse.status,
        code: "UPLOAD_FAILED",
        message: "파일 업로드에 실패했습니다.",
      });
    }
  };

  const runUploadWithXhr = async () =>
    new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", presign.uploadUrl);
      request.withCredentials = false;
      for (const [key, value] of Object.entries(uploadHeaders)) {
        request.setRequestHeader(key, value);
      }

      request.upload.onprogress = (event) => {
        if (!event.lengthComputable || !input.onProgress) {
          return;
        }
        input.onProgress(readUploadProgress(event.loaded, event.total));
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          resolve();
          return;
        }

        reject(
          new AdminApiError({
            status: request.status || 0,
            code: "UPLOAD_FAILED",
            message: "파일 업로드에 실패했습니다.",
          }),
        );
      };

      request.onerror = () => {
        reject(
          new AdminApiError({
            status: request.status || 0,
            code: "UPLOAD_FAILED",
            message: "파일 업로드에 실패했습니다.",
          }),
        );
      };

      request.send(input.file);
    });

  if (input.onProgress) {
    input.onProgress(0);
  }
  if (input.onProgress && typeof XMLHttpRequest !== "undefined") {
    await runUploadWithXhr();
  } else {
    await runUploadWithFetch();
  }
  if (input.onProgress) {
    input.onProgress(100);
  }

  return presign.publicUrl;
};
