import { z } from "zod";

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
});

export type ApiPresignResponse = z.infer<typeof apiPresignResponseSchema>;

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
