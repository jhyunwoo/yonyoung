import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { AdminApiError } from "@/shared/http/http";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import type { ApiPresignResponse, ApiUploadSettleRequest } from "@yonyoung/contracts";

export const PRESIGN_PATHS = {
  activityCover: "/activities/presign/cover",
  activityDetail: "/activities/presign/detail",
  // 활동 첨부파일 (PDF/문서)
  activityFile: "/activities/presign/file",
  exhibitionCover: "/exhibitions/presign/cover",
  exhibitionDetail: "/exhibitions/presign/detail",
  recruitingImage: "/recruiting/presign/image",
  userProfile: "/users/presign/profile",
  // 후원 페이지 첨부파일 (회장/부회장 전용)
  siteFile: "/site/presign/file",
} as const;

export type PresignPath = (typeof PRESIGN_PATHS)[keyof typeof PRESIGN_PATHS];

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

/** 확장자 → 첨부파일 MIME 타입 매핑 (브라우저가 file.type을 비워 보내는 경우 대비) */
const ATTACHMENT_CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/x-hwp",
  hwpx: "application/vnd.hancom.hwpx",
  zip: "application/zip",
};

const defaultContentType = (file: File): string => {
  // 브라우저가 타입을 알려주면 그대로 신뢰 (이미지/문서 공통, 서버 allowlist가 최종 검증)
  if (file.type) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  const extension = name.split(".").at(-1) ?? "";
  const attachmentContentType = ATTACHMENT_CONTENT_TYPE_BY_EXTENSION[extension];
  if (attachmentContentType) {
    return attachmentContentType;
  }
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "gif") {
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

const toUploadError = (status = 0) =>
  new AdminApiError({
    status,
    code: "UPLOAD_FAILED",
    message: "파일 업로드에 실패했습니다.",
  });

const isJsdomEnvironment = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /\bjsdom\b/i.test(navigator.userAgent);
};

const shouldUseUppyUploader = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return !isJsdomEnvironment();
};

const runUploadWithFetch = async (input: {
  uploadUrl: string;
  uploadHeaders: UploadHeaders;
  file: File;
}) => {
  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(input.uploadUrl, {
      method: "PUT",
      mode: "cors",
      credentials: "omit",
      headers: input.uploadHeaders,
      body: input.file,
    });
  } catch {
    throw toUploadError();
  }

  if (!uploadResponse.ok) {
    throw toUploadError(uploadResponse.status);
  }
};

const runUploadWithXhr = async (input: {
  uploadUrl: string;
  uploadHeaders: UploadHeaders;
  file: File;
  onProgress?: (progressPercent: number) => void;
}) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", input.uploadUrl);
    request.withCredentials = false;
    for (const [key, value] of Object.entries(input.uploadHeaders)) {
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

      reject(toUploadError(request.status || 0));
    };

    request.onerror = () => {
      reject(toUploadError(request.status || 0));
    };

    request.send(input.file);
  });

const runUploadWithUppy = async (input: {
  uploadUrl: string;
  uploadHeaders: UploadHeaders;
  file: File;
  onProgress?: (progressPercent: number) => void;
}) => {
  const contentType =
    Object.entries(input.uploadHeaders).find(
      ([name]) => name.toLowerCase() === "content-type",
    )?.[1] ?? input.file.type;
  const uppy = new Uppy({
    autoProceed: false,
    restrictions: {
      maxNumberOfFiles: 1,
    },
  });

  if (input.onProgress) {
    uppy.on("progress", (progress) => {
      input.onProgress?.(clampProgress(progress));
    });
  }

  try {
    uppy.use(AwsS3, {
      limit: 1,
      shouldUseMultipart: false,
      generateObjectKey: () => input.file.name,
      signRequest: async (request) => {
        if (request.method !== "PUT" || "uploadId" in request) {
          throw toUploadError();
        }

        return { url: input.uploadUrl };
      },
    });

    uppy.addFile({
      name: input.file.name,
      type: contentType,
      data: input.file,
      source: "local",
    });

    const result = await uppy.upload();
    if (!result || (result.failed?.length ?? 0) > 0) {
      throw toUploadError();
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }

    throw toUploadError();
  } finally {
    uppy.destroy();
  }
};

const UPLOAD_SETTLE_PATH = "/uploads/settle";

/**
 * 단일 PUT 업로드는 R2가 서버에 완료를 알려주지 않는다. 정산하지 않으면 용량 예약이
 * presign 서명 수명(1시간) 동안 동시 예약 슬롯을 붙들어, 업로드가 모두 성공해도
 * 같은 관리자가 시간당 10건에서 409로 막힌다.
 *
 * 정산 실패가 이미 끝난 업로드를 되돌려서는 안 되므로 항상 best-effort로 호출한다.
 * reservationId가 없으면(구버전 API) 조용히 건너뛴다.
 */
const settleUpload = async (
  reservationId: string | undefined,
  outcome: ApiUploadSettleRequest["outcome"],
): Promise<void> => {
  if (!reservationId) {
    return;
  }

  try {
    await adminRequest<void>(UPLOAD_SETTLE_PATH, "POST", {
      reservationId,
      outcome,
    } satisfies ApiUploadSettleRequest);
  } catch {
    // 예약은 만료로도 회수되므로 무시한다.
  }
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

  if (input.onProgress) {
    input.onProgress(0);
  }

  try {
    if (shouldUseUppyUploader()) {
      await runUploadWithUppy({
        uploadUrl: presign.uploadUrl,
        uploadHeaders,
        file: input.file,
        onProgress: input.onProgress,
      });
    } else if (input.onProgress && typeof XMLHttpRequest !== "undefined") {
      await runUploadWithXhr({
        uploadUrl: presign.uploadUrl,
        uploadHeaders,
        file: input.file,
        onProgress: input.onProgress,
      });
    } else {
      await runUploadWithFetch({
        uploadUrl: presign.uploadUrl,
        uploadHeaders,
        file: input.file,
      });
    }
  } catch (error) {
    await settleUpload(presign.reservationId, "aborted");
    throw error;
  }

  await settleUpload(presign.reservationId, "completed");

  if (input.onProgress) {
    input.onProgress(100);
  }

  return presign.publicUrl;
};
