export type GenerationEntity = {
  id: string;
  name: string;
  sortOrder: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityImageEntity = {
  id: string;
  activityId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityEntity = {
  id: string;
  title: string;
  description: string;
  activityDate: Date;
  coverImageUrl: string;
  generationId: string;
  createdAt: Date;
  updatedAt: Date;
  detailImages: ActivityImageEntity[];
};

export type SupporterEntity = {
  id: string;
  name: string;
  link: string;
  logoUrl: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ExhibitionImageEntity = {
  id: string;
  exhibitionId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ExhibitionEntity = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  detailImages: ExhibitionImageEntity[];
};

export type LinktreeItemEntity = {
  id: string;
  linktreeId: string;
  name: string;
  link: string;
};

export type LinktreeEntity = {
  id: string;
  name: string;
  items: LinktreeItemEntity[];
};

export type UserEntity = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  nickname: string | null;
  role: string | null;
  generationId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DataService = {
  listGenerations: () => Promise<GenerationEntity[]>;
  createGeneration: (input: {
    name: string;
    sortOrder: number;
    startDate: number;
    endDate: number;
  }) => Promise<GenerationEntity>;
  getGenerationById: (id: string) => Promise<GenerationEntity | null>;
  updateGeneration: (
    id: string,
    input: Partial<{
      name: string;
      sortOrder: number;
      startDate: number;
      endDate: number;
    }>,
  ) => Promise<GenerationEntity | null>;
  deleteGeneration: (id: string) => Promise<boolean>;

  listActivities: () => Promise<ActivityEntity[]>;
  listPublicActivities: () => Promise<ActivityEntity[]>;
  createActivity: (input: {
    title: string;
    description: string;
    activityDate: number;
    coverImageUrl: string;
    generationId: string;
  }) => Promise<ActivityEntity>;
  getActivityById: (id: string) => Promise<ActivityEntity | null>;
  updateActivity: (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      activityDate: number;
      coverImageUrl: string;
      generationId: string;
    }>,
  ) => Promise<ActivityEntity | null>;
  deleteActivity: (id: string) => Promise<boolean>;
  addActivityImage: (
    activityId: string,
    input: { imageUrl: string; sortOrder: number },
  ) => Promise<ActivityImageEntity | null>;
  updateActivityImage: (
    activityId: string,
    imageId: string,
    input: Partial<{ imageUrl: string; sortOrder: number }>,
  ) => Promise<ActivityImageEntity | null>;
  deleteActivityImage: (activityId: string, imageId: string) => Promise<boolean>;

  listSupporters: () => Promise<SupporterEntity[]>;
  listPublicSupporters: (nowMs: number) => Promise<SupporterEntity[]>;
  createSupporter: (input: {
    name: string;
    link: string;
    logoUrl: string;
    expiresAt: number;
  }) => Promise<SupporterEntity>;
  getSupporterById: (id: string) => Promise<SupporterEntity | null>;
  updateSupporter: (
    id: string,
    input: Partial<{
      name: string;
      link: string;
      logoUrl: string;
      expiresAt: number;
    }>,
  ) => Promise<SupporterEntity | null>;
  deleteSupporter: (id: string) => Promise<boolean>;

  listExhibitions: () => Promise<ExhibitionEntity[]>;
  listPublicExhibitions: () => Promise<ExhibitionEntity[]>;
  createExhibition: (input: {
    title: string;
    startDate: number;
    endDate: number;
    generationId: string;
    place: string;
    coverImageUrl: string;
    description: string;
  }) => Promise<ExhibitionEntity>;
  getExhibitionById: (id: string) => Promise<ExhibitionEntity | null>;
  updateExhibition: (
    id: string,
    input: Partial<{
      title: string;
      startDate: number;
      endDate: number;
      generationId: string;
      place: string;
      coverImageUrl: string;
      description: string;
    }>,
  ) => Promise<ExhibitionEntity | null>;
  deleteExhibition: (id: string) => Promise<boolean>;
  addExhibitionImage: (
    exhibitionId: string,
    input: { imageUrl: string; sortOrder: number },
  ) => Promise<ExhibitionImageEntity | null>;
  updateExhibitionImage: (
    exhibitionId: string,
    imageId: string,
    input: Partial<{ imageUrl: string; sortOrder: number }>,
  ) => Promise<ExhibitionImageEntity | null>;
  deleteExhibitionImage: (
    exhibitionId: string,
    imageId: string,
  ) => Promise<boolean>;

  listLinktrees: () => Promise<LinktreeEntity[]>;
  createLinktree: (input: { name: string }) => Promise<LinktreeEntity>;
  getLinktreeById: (id: string) => Promise<LinktreeEntity | null>;
  updateLinktree: (
    id: string,
    input: Partial<{ name: string }>,
  ) => Promise<LinktreeEntity | null>;
  deleteLinktree: (id: string) => Promise<boolean>;
  addLinktreeItem: (
    linktreeId: string,
    input: { name: string; link: string },
  ) => Promise<LinktreeItemEntity | null>;
  updateLinktreeItem: (
    linktreeId: string,
    itemId: string,
    input: Partial<{ name: string; link: string }>,
  ) => Promise<LinktreeItemEntity | null>;
  deleteLinktreeItem: (linktreeId: string, itemId: string) => Promise<boolean>;

  listUsers: () => Promise<UserEntity[]>;
  getUserById: (id: string) => Promise<UserEntity | null>;
  updateUser: (
    id: string,
    input: Partial<{
      name: string;
      nickname: string | null;
      image: string | null;
      role: string;
      generationId: string | null;
    }>,
  ) => Promise<UserEntity | null>;
  deleteUser: (id: string) => Promise<boolean>;
};

export type PresignService = {
  issuePresignedPutUrl: (input: {
    actorId: string;
    resource: "activities" | "exhibitions" | "supporters" | "users";
    slot: "cover" | "detail" | "logo" | "profile";
    fileName: string;
    contentType: string;
  }) => Promise<{
    uploadUrl: string;
    objectKey: string;
    publicUrl: string;
    requiredHeaders: {
      "Content-Type": string;
    };
  }>;
};
