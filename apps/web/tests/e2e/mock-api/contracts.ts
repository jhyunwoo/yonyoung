import type {
  ApiActivity,
  ApiAttachment,
  ApiAuditLog,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiRecruitingPlan,
  ApiSiteSettings,
  ApiUser,
} from "../../../shared/contracts/api-contracts";

export type MockRole =
  "guest" | "unverified" | "member" | "manager" | "vice_president" | "president";

export type MockUploadObject = {
  objectKey: string;
  publicUrl: string;
  uploaded: boolean;
  contentType: string;
  fileSize: number;
};

export type MockState = {
  users: ApiUser[];
  generations: ApiGeneration[];
  activities: ApiActivity[];
  attachments: ApiAttachment[];
  exhibitions: ApiExhibition[];
  linktrees: ApiLinktree[];
  recruitingPlan: ApiRecruitingPlan | null;
  siteSettings: ApiSiteSettings;
  uploads: Record<string, MockUploadObject>;
  auditLogs: ApiAuditLog[];
};

export type MockSessionUser = Pick<
  ApiUser,
  | "id"
  | "email"
  | "name"
  | "image"
  | "familyName"
  | "givenName"
  | "college"
  | "department"
  | "studentNumber"
  | "phoneNumber"
  | "collaborationAvailable"
  | "personalLink"
  | "role"
  | "generationId"
  | "generationIds"
>;
