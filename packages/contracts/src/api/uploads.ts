import { z } from "zod";

export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
] as const;

/** 이미지 업로드 <input accept> 값 (서버 이미지 allowlist와 동기화) */
export const IMAGE_UPLOAD_ACCEPT = ALLOWED_IMAGE_CONTENT_TYPES.join(",");

/**
 * 브라우저·OS마다 같은 형식을 다른 MIME 이름으로 보고한다.
 * 예) Windows Chrome/Edge는 .zip을 `application/x-zip-compressed`로 보고한다.
 * 업로드 allowlist 비교 전에 표준 이름으로 맞춘다 — 웹 클라이언트와 API가 같은 표를 쓴다.
 */
const UPLOAD_CONTENT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  "application/x-zip-compressed": "application/zip",
  "application/x-zip": "application/zip",
  "multipart/x-zip": "application/zip",
  "application/haansofthwpx": "application/vnd.hancom.hwpx",
  "application/hwp+zip": "application/vnd.hancom.hwpx",
  "application/x-hwpx": "application/vnd.hancom.hwpx",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

/** MIME 문자열을 소문자·파라미터 제거·별칭 치환해 비교 가능한 표준 이름으로 만든다. */
export const normalizeUploadContentType = (contentType: string): string => {
  const base = (contentType.split(";")[0] ?? "").trim().toLowerCase();
  return UPLOAD_CONTENT_TYPE_ALIASES[base] ?? base;
};

export const apiPresignRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export type ApiPresignRequest = z.infer<typeof apiPresignRequestSchema>;

export const apiPresignResponseSchema = z.object({
  uploadUrl: z.url(),
  objectKey: z.string(),
  publicUrl: z.url(),
  requiredHeaders: z.record(z.string(), z.string()).optional(),
  // 업로드가 끝난 뒤 용량 예약을 정산할 때 쓴다. API 배포가 웹보다 늦을 수 있어
  // 선택 항목으로 둔다 — 값이 없으면 소비자는 정산을 건너뛴다.
  reservationId: z.string().optional(),
});

export type ApiPresignResponse = z.infer<typeof apiPresignResponseSchema>;

export const UPLOAD_SETTLE_OUTCOMES = ["completed", "aborted"] as const;

export const apiUploadSettleRequestSchema = z.object({
  reservationId: z.string().min(1),
  outcome: z.enum(UPLOAD_SETTLE_OUTCOMES),
});

export type ApiUploadSettleRequest = z.infer<
  typeof apiUploadSettleRequestSchema
>;

export type ApiMultipartUploadInitRequest = {
  fileName: string;
  contentType: string;
  fileSize: number;
};

export type ApiMultipartUploadInitResponse = {
  uploadId: string;
  objectKey: string;
  publicUrl: string;
  partSize: number;
  maxPartNumber: number;
};

export type ApiMultipartUploadPartRequest = {
  uploadId: string;
  objectKey: string;
  partNumber: number;
};

export type ApiMultipartUploadPartResponse = {
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
};

export type ApiMultipartUploadedPart = {
  partNumber: number;
  etag: string;
};

export type ApiMultipartUploadCompleteRequest = {
  uploadId: string;
  objectKey: string;
  parts: ApiMultipartUploadedPart[];
};

export type ApiMultipartUploadCompleteResponse = {
  objectKey: string;
  publicUrl: string;
};

export type ApiMultipartUploadAbortRequest = {
  uploadId: string;
  objectKey: string;
};
