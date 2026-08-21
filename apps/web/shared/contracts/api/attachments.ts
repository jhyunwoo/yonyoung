import { z } from "zod";

import { apiTimestampSchema } from "@/shared/contracts/api/common";

export const apiAttachmentScopeSchema = z.enum(["activity", "site_donate"]);

/**
 * 첨부파일 소속 구분.
 * - "activity": 개별 활동 페이지 자료 (resourceId = 활동 UUID)
 * - "site_donate": 후원 페이지 전역 자료 (resourceId = null)
 */
export type ApiAttachmentScope = z.infer<typeof apiAttachmentScopeSchema>;

export const apiAttachmentSchema = z.object({
  id: z.string(),
  scope: apiAttachmentScopeSchema,
  resourceId: z.string().nullable(),
  title: z.string(),
  fileUrl: z.url().nullable(),
  fileName: z.string().nullable(),
  fileSize: z.number().int().nonnegative().nullable(),
  mimeType: z.string().nullable(),
  // 구버전 API 응답(linkUrl 없음)도 허용하기 위해 default(null)
  linkUrl: z.url().nullable().default(null),
  sortOrder: z.number().int(),
  createdAt: apiTimestampSchema,
  updatedAt: apiTimestampSchema,
});

/** 파일 첨부(fileUrl 세트)와 외부 링크(linkUrl) 중 정확히 하나만 값이 채워진다. */
export type ApiAttachment = z.infer<typeof apiAttachmentSchema>;

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export const apiCreateAttachmentInputSchema = z
  .object({
    scope: apiAttachmentScopeSchema,
    resourceId: z.string().nullable().optional(),
    title: z.string().trim().min(1).max(200),
    fileUrl: z.url().optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    fileSize: z.number().int().positive().optional(),
    mimeType: z.string().min(1).optional(),
    linkUrl: z
      .url()
      .refine(isHttpUrl, "linkUrl은 http(s) URL만 사용할 수 있습니다.")
      .optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .refine(
    (input) => {
      const fileFields = [input.fileUrl, input.fileName, input.fileSize, input.mimeType];
      const hasFile = fileFields.every((field) => field !== undefined);
      const hasAnyFileField = fileFields.some((field) => field !== undefined);
      const hasLink = input.linkUrl !== undefined;
      if (hasLink) {
        return !hasAnyFileField;
      }
      return hasFile;
    },
    {
      message:
        "파일 필드 세트(fileUrl, fileName, fileSize, mimeType)와 linkUrl 중 정확히 하나만 전달해야 합니다.",
    },
  );

/** 생성 시에는 파일 필드 세트(fileUrl~mimeType) 또는 linkUrl 중 정확히 하나만 전달한다. */
export type ApiCreateAttachmentInput = {
  scope: ApiAttachmentScope;
  resourceId?: string | null;
  title: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  linkUrl?: string;
  sortOrder?: number;
};

export const apiUpdateAttachmentInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export type ApiUpdateAttachmentInput = {
  title?: string;
  sortOrder?: number;
};

/** 첨부파일 업로드 <input accept>에 사용하는 확장자 목록 (서버 allowlist와 동기화) */
export const ATTACHMENT_ACCEPT = ".pdf,.xlsx,.xls,.docx,.hwp,.hwpx,.zip";
