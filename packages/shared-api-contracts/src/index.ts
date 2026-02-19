import type { CoreRole } from "@repo/shared-auth/roles";

export const API_ERROR_CODES = [
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export type DataEnvelope<T> = {
  data: T;
};

export type ApiKnownRole = CoreRole | "member";
export type ApiRole = ApiKnownRole | (string & {});

export type ApiGeneration = {
  id: string;
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiCreateGenerationInput = {
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
};

export type ApiUpdateGenerationInput = Partial<ApiCreateGenerationInput>;

export type ApiActivityImage = {
  id: string;
  activityId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiActivity = {
  id: string;
  title: string;
  description: string;
  startDate: number;
  endDate: number;
  coverImageUrl: string;
  generationId: string;
  createdAt: number;
  updatedAt: number;
  detailImages: ApiActivityImage[];
};

export type ApiCreateActivityInput = {
  title: string;
  description: string;
  startDate: number;
  endDate: number;
  coverImageUrl: string;
  generationId: string;
};

export type ApiUpdateActivityInput = Partial<ApiCreateActivityInput>;

export type ApiCreateActivityImageInput = {
  imageUrl: string;
  sortOrder: number;
};

export type ApiUpdateActivityImageInput = Partial<ApiCreateActivityImageInput>;

export type ApiUpdateActivityImageBatchItemInput = {
  imageId: string;
  imageUrl?: string;
  sortOrder?: number;
};

export type ApiSupporter = {
  id: string;
  name: string;
  link: string;
  logoUrl: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiCreateSupporterInput = {
  name: string;
  link: string;
  logoUrl: string;
  expiresAt: number;
};

export type ApiUpdateSupporterInput = Partial<ApiCreateSupporterInput>;

export type ApiExhibitionImage = {
  id: string;
  exhibitionId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export type ApiExhibition = {
  id: string;
  title: string;
  startDate: number;
  endDate: number;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  detailImages: ApiExhibitionImage[];
};

export type ApiCreateExhibitionInput = {
  title: string;
  startDate: number;
  endDate: number;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
};

export type ApiUpdateExhibitionInput = Partial<ApiCreateExhibitionInput>;

export type ApiCreateExhibitionImageInput = {
  imageUrl: string;
  sortOrder: number;
};

export type ApiUpdateExhibitionImageInput = Partial<ApiCreateExhibitionImageInput>;

export type ApiUpdateExhibitionImageBatchItemInput = {
  imageId: string;
  imageUrl?: string;
  sortOrder?: number;
};

export type ApiLinktreeItem = {
  id: string;
  linktreeId: string;
  name: string;
  link: string;
};

export type ApiLinktree = {
  id: string;
  name: string;
  items: ApiLinktreeItem[];
};

export type ApiCreateLinktreeInput = {
  name: string;
};

export type ApiUpdateLinktreeInput = Partial<ApiCreateLinktreeInput>;

export type ApiCreateLinktreeItemInput = {
  name: string;
  link: string;
};

export type ApiUpdateLinktreeItemInput = Partial<ApiCreateLinktreeItemInput>;

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  familyName: string | null;
  givenName: string | null;
  college: string | null;
  department: string | null;
  studentNumber: string | null;
  phoneNumber: string | null;
  role: ApiRole | null;
  generationId: string | null;
  generationIds?: string[];
  createdAt: number;
  updatedAt: number;
};

export type ApiPublicGenerationMember = {
  id: string;
  name: string;
  image: string | null;
  familyName: string | null;
  givenName: string | null;
  role: ApiRole | null;
  generationId: string;
};

export type ApiPublicGenerationWithMembers = {
  id: string;
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
  members: ApiPublicGenerationMember[];
};

export type ApiAdminUpdateUserInput = {
  name?: string;
  image?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  role?: CoreRole;
  generationIds?: string[];
  generationId?: string | null;
};

export type ApiMemberProfileUpdateInput = {
  image?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
};

export type ApiUpdateUserInput = ApiAdminUpdateUserInput | ApiMemberProfileUpdateInput;

export type ApiBulkUpdateUserRoleInput = {
  userIds: string[];
  role: CoreRole;
};

export type ApiAdminDashboardStats = {
  usersTotal: number;
  unverifiedUsersTotal: number;
  generationsTotal: number;
  selectedGenerationMembersTotal: number;
  selectedGenerationActivitiesTotal: number;
  selectedGenerationExhibitionsTotal: number;
  activeSupportersTotal: number;
  linktreeLinksTotal: number;
};

export type ApiPresignRequest = {
  fileName: string;
  contentType: string;
};

export type ApiPresignResponse = {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  requiredHeaders?: Record<string, string>;
};
