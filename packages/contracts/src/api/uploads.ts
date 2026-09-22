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
