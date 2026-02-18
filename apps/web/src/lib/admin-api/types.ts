import type { AuthRole } from "../auth-shared";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

    /**
   * constructor의 핵심 비즈니스 로직을 수행합니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  constructor(input: { status: number; code?: string; message: string }) {
    super(input.message);
    this.name = "AdminApiError";
    this.status = input.status;
    this.code = input.code ?? "UNKNOWN";
  }
}

export type DataEnvelope<T> = {
  data: T;
};

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
  activityDate: number;
  coverImageUrl: string;
  generationId: string;
  createdAt: number;
  updatedAt: number;
  detailImages: ApiActivityImage[];
};

export type ApiCreateActivityInput = {
  title: string;
  description: string;
  activityDate: number;
  coverImageUrl: string;
  generationId: string;
};

export type ApiUpdateActivityInput = Partial<ApiCreateActivityInput>;

export type ApiCreateActivityImageInput = {
  imageUrl: string;
  sortOrder: number;
};

export type ApiUpdateActivityImageInput = Partial<ApiCreateActivityImageInput>;

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
  nickname: string | null;
  familyName: string | null;
  givenName: string | null;
  college: string | null;
  department: string | null;
  studentNumber: string | null;
  phoneNumber: string | null;
  role: AuthRole | null;
  generationId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ApiAdminUpdateUserInput = {
  name?: string;
  nickname?: string | null;
  image?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
  role?:
    | "president"
    | "vice_president"
    | "manager"
    | "new_member"
    | "associate_member"
    | "regular_member"
    | "unverified";
  generationId?: string | null;
};

export type ApiMemberProfileUpdateInput = {
  name?: string;
  nickname?: string | null;
  image?: string | null;
  familyName?: string | null;
  givenName?: string | null;
  college?: string | null;
  department?: string | null;
  studentNumber?: string | null;
  phoneNumber?: string | null;
};

export type ApiUpdateUserInput = ApiAdminUpdateUserInput | ApiMemberProfileUpdateInput;

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
