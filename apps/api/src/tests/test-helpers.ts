import { expect, vi } from "vitest";
import { createApp } from "../app";
import type { Actor, Role } from "../lib/authorization/types";
import type {
  ActivityEntity,
  ActivityImageEntity,
  DataService,
  ExhibitionEntity,
  ExhibitionImageEntity,
  GenerationEntity,
  LinktreeEntity,
  LinktreeItemEntity,
  PresignService,
  SupporterEntity,
  UserEntity,
} from "../lib/services/types";
import type { OpenAPIDocument } from "../lib/openapi/merge";

export const IDs = {
  generation: "10000000-0000-4000-8000-000000000001",
  generationAlt: "10000000-0000-4000-8000-000000000002",
  activity: "20000000-0000-4000-8000-000000000001",
  activityImage: "21000000-0000-4000-8000-000000000001",
  supporter: "30000000-0000-4000-8000-000000000001",
  exhibition: "40000000-0000-4000-8000-000000000001",
  exhibitionImage: "41000000-0000-4000-8000-000000000001",
  linktree: "50000000-0000-4000-8000-000000000001",
  linktreeItem: "51000000-0000-4000-8000-000000000001",
  otherUuid: "90000000-0000-4000-8000-000000000001",
  member: "user-member-0001",
  otherUser: "user-member-0002",
  manager: "user-manager-0003",
  vicePresident: "user-vp-0004",
  president: "user-president-0005",
} as const;

const BASE_DATE = new Date("2030-01-01T00:00:00.000Z");

export const createActor = (role: Role, id = IDs.member): Actor => ({
  id,
  role,
  rawRole: role,
  name: `${role}-name`,
  email: `${role}@example.com`,
  generationId: null,
});

export const createGeneration = (
  overrides: Partial<GenerationEntity> = {},
): GenerationEntity => ({
  id: IDs.generation,
  name: "10기",
  sortOrder: 10,
  startDate: BASE_DATE,
  endDate: new Date("2030-12-31T00:00:00.000Z"),
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

export const createActivityImage = (
  overrides: Partial<ActivityImageEntity> = {},
): ActivityImageEntity => ({
  id: IDs.activityImage,
  activityId: IDs.activity,
  imageUrl: "https://example.com/activity-detail.jpg",
  sortOrder: 0,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

export const createActivity = (
  overrides: Partial<ActivityEntity> = {},
): ActivityEntity => ({
  id: IDs.activity,
  title: "워크숍",
  description: "상세 설명",
  activityDate: BASE_DATE,
  coverImageUrl: "https://example.com/activity-cover.jpg",
  generationId: IDs.generation,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  detailImages: [],
  ...overrides,
});

export const createSupporter = (
  overrides: Partial<SupporterEntity> = {},
): SupporterEntity => ({
  id: IDs.supporter,
  name: "Yonyoung Sponsor",
  link: "https://example.com/sponsor",
  logoUrl: "https://example.com/sponsor-logo.png",
  expiresAt: new Date("2031-01-01T00:00:00.000Z"),
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

export const createExhibitionImage = (
  overrides: Partial<ExhibitionImageEntity> = {},
): ExhibitionImageEntity => ({
  id: IDs.exhibitionImage,
  exhibitionId: IDs.exhibition,
  imageUrl: "https://example.com/exhibition-detail.jpg",
  sortOrder: 0,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

export const createExhibition = (
  overrides: Partial<ExhibitionEntity> = {},
): ExhibitionEntity => ({
  id: IDs.exhibition,
  title: "정기전",
  startDate: new Date("2031-02-01T00:00:00.000Z"),
  endDate: new Date("2031-02-15T00:00:00.000Z"),
  generationId: IDs.generation,
  place: "아트홀",
  coverImageUrl: "https://example.com/exhibition-cover.jpg",
  description: "전시 설명",
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  detailImages: [],
  ...overrides,
});

export const createLinktreeItem = (
  overrides: Partial<LinktreeItemEntity> = {},
): LinktreeItemEntity => ({
  id: IDs.linktreeItem,
  linktreeId: IDs.linktree,
  name: "Instagram",
  link: "https://instagram.com/yonyoung",
  ...overrides,
});

export const createLinktree = (
  overrides: Partial<LinktreeEntity> = {},
): LinktreeEntity => ({
  id: IDs.linktree,
  name: "Yonyoung",
  items: [],
  ...overrides,
});

export const createUser = (
  overrides: Partial<UserEntity> = {},
): UserEntity => ({
  id: IDs.member,
  name: "tester",
  email: "tester@example.com",
  image: null,
  nickname: null,
  role: "regular_member",
  generationId: null,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  ...overrides,
});

export const createDataServiceMock = (
  overrides: Partial<DataService> = {},
): DataService => {
  return new Proxy(overrides as DataService, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof DataService];
      }
      return async () => {
        throw new Error(`Unexpected DataService call: ${String(prop)}`);
      };
    },
  }) as DataService;
};

export const createPresignServiceMock = (
  overrides: Partial<PresignService> = {},
): PresignService => {
  return new Proxy(overrides as PresignService, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as keyof PresignService];
      }
      return async () => {
        throw new Error(`Unexpected PresignService call: ${String(prop)}`);
      };
    },
  }) as PresignService;
};

const defaultAuthOpenApiSchema: OpenAPIDocument = {
  openapi: "3.1.1",
  info: { title: "auth", version: "1.0.0" },
  paths: {},
};

export const createTestApp = (input: {
  actor: Actor | null;
  dataService?: DataService;
  presignService?: PresignService;
  getAuthOpenApiSchema?: () => Promise<OpenAPIDocument>;
}) => {
  return createApp({
    resolveActor: async () => input.actor,
    getDataService: () => input.dataService ?? createDataServiceMock(),
    getPresignService: () => input.presignService ?? createPresignServiceMock(),
    getAuthOpenApiSchema: input.getAuthOpenApiSchema ?? (async () => defaultAuthOpenApiSchema),
  });
};

export const readJson = async <T>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

export const expectErrorCode = async (
  response: Response,
  code:
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL_ERROR",
) => {
  const body = await readJson<{ error: { code: string; message: string } }>(response);
  expect(body.error.code).toBe(code);
  expect(typeof body.error.message).toBe("string");
  expect(body.error.message.length).toBeGreaterThan(0);
};

export const fn = vi.fn;
