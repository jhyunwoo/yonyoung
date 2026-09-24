import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { AdminApiError } from "@/shared/http/http";
import { adminRequest } from "@/features/dashboard/api/admin-api/http";
import {
  ALLOWED_ATTACHMENT_CONTENT_TYPES,
  ALLOWED_IMAGE_CONTENT_TYPES,
  normalizeUploadContentType,
  type ApiPresignResponse,
  type ApiUploadSettleRequest,
} from "@yonyoung/contracts";

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

/** 확장자 → MIME 타입 매핑 (브라우저가 file.type을 비우거나 비표준 이름을 보내는 경우 대비) */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  hwp: "application/x-hwp",
  hwpx: "application/vnd.hancom.hwpx",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

const UPLOAD_ALLOWED_CONTENT_TYPES: ReadonlySet<string> = new Set<string>([
  ...ALLOWED_IMAGE_CONTENT_TYPES,
  ...ALLOWED_ATTACHMENT_CONTENT_TYPES,
]);

/**
 * 업로드에 쓸 Content-Type을 결정한다.
 * 1) 브라우저가 알려준 타입을 표준 이름으로 정규화해 allowlist에 있으면 그대로 쓴다.
 * 2) 비어 있거나 allowlist 밖이면(예: Windows의 .zip, macOS의 .hwp) 확장자로 판정한다.
 * 3) 둘 다 실패하면 정규화한 원래 값을 돌려 서버가 415로 거절하게 한다 — 임의의 타입으로
 *    속여 올리지 않는다. presign 요청과 첨부 레코드의 mimeType이 반드시 같은 값을 쓴다.
 */
export const resolveUploadContentType = (file: Pick<File, "name" | "type">): string => {
  const reported = file.type ? normalizeUploadContentType(file.type) : "";
  if (reported && UPLOAD_ALLOWED_CONTENT_TYPES.has(reported)) {
    return reported;
  }

  const extension = file.name.toLowerCase().split(".").at(-1) ?? "";
  const byExtension = CONTENT_TYPE_BY_EXTENSION[extension];
  if (byExtension) {
    return byExtension;
  }

  return reported || "application/octet-stream";
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

/**
 * 진행이 이 시간 동안 전혀 없으면 업로드가 멈춘 것으로 보고 중단한다.
 * 불안정한 모바일 망에서 PUT이 끝없이 매달려 저장 버튼이 영원히 "저장 중"에 머무는 것을 막는다.
 */
export const UPLOAD_STALL_TIMEOUT_MS = 120_000;

const toUploadTimeoutError = () =>
  new AdminApiError({
    status: 408,
    code: "UPLOAD_TIMEOUT",
    message:
      "파일 업로드가 오래 멈춰 있어 중단했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
  });

/** 진행 신호가 올 때마다 다시 감기는 정지 감지 타이머. */
const createStallWatchdog = (
  onStall: () => void,
  timeoutMs = UPLOAD_STALL_TIMEOUT_MS,
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const bump = () => {
    clear();
    timer = setTimeout(onStall, timeoutMs);
  };

  return { bump, clear };
};

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
  // fetch는 업로드 진행 이벤트가 없어 "정지"를 알 수 없으므로, 응답이 올 때까지의 전체 대기 시간을 제한한다.
  const controller = new AbortController();
  let timedOut = false;
  const watchdog = createStallWatchdog(() => {
    timedOut = true;
    controller.abort();
  });
  watchdog.bump();

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(input.uploadUrl, {
      method: "PUT",
      mode: "cors",
      credentials: "omit",
      headers: input.uploadHeaders,
      body: input.file,
      signal: controller.signal,
    });
  } catch {
    throw timedOut ? toUploadTimeoutError() : toUploadError();
  } finally {
    watchdog.clear();
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
    let timedOut = false;
    const watchdog = createStallWatchdog(() => {
      timedOut = true;
      request.abort();
    });
    request.open("PUT", input.uploadUrl);
    request.withCredentials = false;
    for (const [key, value] of Object.entries(input.uploadHeaders)) {
      request.setRequestHeader(key, value);
    }

    request.upload.onprogress = (event) => {
      watchdog.bump();
      if (!event.lengthComputable || !input.onProgress) {
        return;
      }
      input.onProgress(readUploadProgress(event.loaded, event.total));
    };

    request.onload = () => {
      watchdog.clear();
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(toUploadError(request.status || 0));
    };

    request.onerror = () => {
      watchdog.clear();
      reject(toUploadError(request.status || 0));
    };

    request.onabort = () => {
      watchdog.clear();
      reject(timedOut ? toUploadTimeoutError() : toUploadError());
    };

    watchdog.bump();
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

  // 바이트 진행이 멈추면 전체 업로드를 취소한다. cancelAll 후 upload()가 끝나지 않을 수 있어
  // 정지 신호를 별도 Promise로 경쟁시킨다.
  let rejectStall: ((error: AdminApiError) => void) | null = null;
  const stalled = new Promise<never>((_, reject) => {
    rejectStall = reject;
  });
  const watchdog = createStallWatchdog(() => {
    uppy.cancelAll();
    rejectStall?.(toUploadTimeoutError());
  });
  uppy.on("upload-progress", () => {
    watchdog.bump();
  });

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

    watchdog.bump();
    const result = await Promise.race([uppy.upload(), stalled]);
    if (!result || (result.failed?.length ?? 0) > 0) {
      throw toUploadError();
    }
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }

    throw toUploadError();
  } finally {
    watchdog.clear();
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
  const contentType = resolveUploadContentType(input.file);
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
