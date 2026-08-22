import { describe, expect, it } from "vitest";

import { apiActivityImageSchema } from "@/shared/contracts/api/activities";
import { apiAuditLogSchema } from "@/shared/contracts/api/audit";
import {
  ATTACHMENT_ACCEPT,
  apiAttachmentSchema,
  apiCreateAttachmentInputSchema,
} from "@/shared/contracts/api/attachments";
import {
  API_ERROR_CODES,
  apiRoleSchema,
} from "@/shared/contracts/api/common";
import { apiAdminDashboardStatsSchema } from "@/shared/contracts/api/dashboard";
import { apiExhibitionImageSchema } from "@/shared/contracts/api/exhibitions";
import { apiGenerationSchema } from "@/shared/contracts/api/generations";
import { apiLinktreeSchema } from "@/shared/contracts/api/linktree";
import { apiRecruitingPlanSchema } from "@/shared/contracts/api/recruiting";
import {
  DEFAULT_SITE_SETTINGS,
  apiSiteSettingsSchema,
} from "@/shared/contracts/api/site-settings";
import { apiPresignResponseSchema } from "@/shared/contracts/api/uploads";
import { apiUserSchema } from "@/shared/contracts/api/users";
import * as legacyContracts from "@/shared/contracts/api-contracts";
import * as legacySchemas from "@/shared/contracts/api-schemas";

describe("shared/contracts/api domain modules", () => {
  it("keeps the compatibility facade bound to every domain module", () => {
    expect(legacySchemas.apiRoleSchema).toBe(apiRoleSchema);
    expect(legacySchemas.apiAuditLogSchema).toBe(apiAuditLogSchema);
    expect(legacySchemas.apiGenerationSchema).toBe(apiGenerationSchema);
    expect(legacySchemas.apiActivityImageSchema).toBe(apiActivityImageSchema);
    expect(legacySchemas.apiExhibitionImageSchema).toBe(apiExhibitionImageSchema);
    expect(legacySchemas.apiAttachmentSchema).toBe(apiAttachmentSchema);
    expect(legacySchemas.apiLinktreeSchema).toBe(apiLinktreeSchema);
    expect(legacySchemas.apiSiteSettingsSchema).toBe(apiSiteSettingsSchema);
    expect(legacySchemas.apiRecruitingPlanSchema).toBe(apiRecruitingPlanSchema);
    expect(legacySchemas.apiUserSchema).toBe(apiUserSchema);
    expect(legacySchemas.apiAdminDashboardStatsSchema).toBe(
      apiAdminDashboardStatsSchema,
    );
    expect(legacySchemas.apiPresignResponseSchema).toBe(apiPresignResponseSchema);
  });

  it("keeps contract constants available through the compatibility facade", () => {
    expect(legacyContracts.API_ERROR_CODES).toBe(API_ERROR_CODES);
    expect(legacyContracts.ATTACHMENT_ACCEPT).toBe(ATTACHMENT_ACCEPT);
    expect(legacyContracts.DEFAULT_SITE_SETTINGS).toBe(DEFAULT_SITE_SETTINGS);
  });

  it("preserves legacy image dimension defaults", () => {
    const commonImage = {
      id: "image-id",
      imageUrl: "https://storage.example.com/image.jpg",
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 2,
    };

    expect(
      apiActivityImageSchema.parse({
        ...commonImage,
        activityId: "activity-id",
      }),
    ).toMatchObject({ width: null, height: null });
    expect(
      apiExhibitionImageSchema.parse({
        ...commonImage,
        exhibitionId: "exhibition-id",
      }),
    ).toMatchObject({ width: null, height: null });
  });

  it("preserves the legacy attachment link default", () => {
    const parsed = apiAttachmentSchema.parse({
      id: "attachment-id",
      scope: "activity",
      resourceId: "activity-id",
      title: "자료",
      fileUrl: "https://storage.example.com/file.pdf",
      fileName: "file.pdf",
      fileSize: 10,
      mimeType: "application/pdf",
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 2,
    });

    expect(parsed.linkUrl).toBeNull();
  });

  it("preserves the attachment exclusivity validation message", () => {
    const parsed = apiCreateAttachmentInputSchema.safeParse({
      scope: "activity",
      title: "자료",
      fileUrl: "https://storage.example.com/file.pdf",
      fileName: "file.pdf",
      fileSize: 10,
      mimeType: "application/pdf",
      linkUrl: "https://example.com/document",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map(({ message }) => message)).toContain(
        "파일 필드 세트(fileUrl, fileName, fileSize, mimeType)와 linkUrl 중 정확히 하나만 전달해야 합니다.",
      );
    }
  });
});
