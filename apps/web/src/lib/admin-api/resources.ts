import { adminRequest } from "./http";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiAdminUpdateUserInput,
  ApiCreateActivityImageInput,
  ApiCreateActivityInput,
  ApiCreateExhibitionImageInput,
  ApiCreateExhibitionInput,
  ApiCreateGenerationInput,
  ApiCreateLinktreeInput,
  ApiCreateLinktreeItemInput,
  ApiCreateSupporterInput,
  ApiExhibition,
  ApiExhibitionImage,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiSupporter,
  ApiUpdateActivityImageInput,
  ApiUpdateActivityInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionInput,
  ApiUpdateGenerationInput,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
  ApiUpdateSupporterInput,
  ApiUser,
} from "./types";

export const adminResourceApi = {
  listGenerations: () => adminRequest<ApiGeneration[]>("/generations", "GET"),
  createGeneration: (input: ApiCreateGenerationInput) =>
    adminRequest<ApiGeneration>("/generations", "POST", input),
  getGenerationById: (id: string) =>
    adminRequest<ApiGeneration>(`/generations/${id}`, "GET"),
  updateGeneration: (id: string, input: ApiUpdateGenerationInput) =>
    adminRequest<ApiGeneration>(`/generations/${id}`, "PATCH", input),
  deleteGeneration: (id: string) => adminRequest<void>(`/generations/${id}`, "DELETE"),

  listActivities: () => adminRequest<ApiActivity[]>("/activities", "GET"),
  createActivity: (input: ApiCreateActivityInput) =>
    adminRequest<ApiActivity>("/activities", "POST", input),
  getActivityById: (id: string) => adminRequest<ApiActivity>(`/activities/${id}`, "GET"),
  updateActivity: (id: string, input: ApiUpdateActivityInput) =>
    adminRequest<ApiActivity>(`/activities/${id}`, "PATCH", input),
  deleteActivity: (id: string) => adminRequest<void>(`/activities/${id}`, "DELETE"),
  addActivityImage: (id: string, input: ApiCreateActivityImageInput) =>
    adminRequest<ApiActivityImage>(`/activities/${id}/images`, "POST", input),
  updateActivityImage: (
    id: string,
    imageId: string,
    input: ApiUpdateActivityImageInput,
  ) => adminRequest<ApiActivityImage>(`/activities/${id}/images/${imageId}`, "PATCH", input),
  deleteActivityImage: (id: string, imageId: string) =>
    adminRequest<void>(`/activities/${id}/images/${imageId}`, "DELETE"),

  listSupporters: () => adminRequest<ApiSupporter[]>("/supporters", "GET"),
  createSupporter: (input: ApiCreateSupporterInput) =>
    adminRequest<ApiSupporter>("/supporters", "POST", input),
  getSupporterById: (id: string) =>
    adminRequest<ApiSupporter>(`/supporters/${id}`, "GET"),
  updateSupporter: (id: string, input: ApiUpdateSupporterInput) =>
    adminRequest<ApiSupporter>(`/supporters/${id}`, "PATCH", input),
  deleteSupporter: (id: string) => adminRequest<void>(`/supporters/${id}`, "DELETE"),

  listExhibitions: () => adminRequest<ApiExhibition[]>("/exhibitions", "GET"),
  createExhibition: (input: ApiCreateExhibitionInput) =>
    adminRequest<ApiExhibition>("/exhibitions", "POST", input),
  getExhibitionById: (id: string) =>
    adminRequest<ApiExhibition>(`/exhibitions/${id}`, "GET"),
  updateExhibition: (id: string, input: ApiUpdateExhibitionInput) =>
    adminRequest<ApiExhibition>(`/exhibitions/${id}`, "PATCH", input),
  deleteExhibition: (id: string) => adminRequest<void>(`/exhibitions/${id}`, "DELETE"),
  addExhibitionImage: (id: string, input: ApiCreateExhibitionImageInput) =>
    adminRequest<ApiExhibitionImage>(`/exhibitions/${id}/images`, "POST", input),
  updateExhibitionImage: (
    id: string,
    imageId: string,
    input: ApiUpdateExhibitionImageInput,
  ) => adminRequest<ApiExhibitionImage>(`/exhibitions/${id}/images/${imageId}`, "PATCH", input),
  deleteExhibitionImage: (id: string, imageId: string) =>
    adminRequest<void>(`/exhibitions/${id}/images/${imageId}`, "DELETE"),

  listLinktrees: () => adminRequest<ApiLinktree[]>("/linktree", "GET"),
  createLinktree: (input: ApiCreateLinktreeInput) =>
    adminRequest<ApiLinktree>("/linktree", "POST", input),
  getLinktreeById: (id: string) => adminRequest<ApiLinktree>(`/linktree/${id}`, "GET"),
  updateLinktree: (id: string, input: ApiUpdateLinktreeInput) =>
    adminRequest<ApiLinktree>(`/linktree/${id}`, "PATCH", input),
  deleteLinktree: (id: string) => adminRequest<void>(`/linktree/${id}`, "DELETE"),
  addLinktreeItem: (id: string, input: ApiCreateLinktreeItemInput) =>
    adminRequest<ApiLinktreeItem>(`/linktree/${id}/items`, "POST", input),
  updateLinktreeItem: (id: string, itemId: string, input: ApiUpdateLinktreeItemInput) =>
    adminRequest<ApiLinktreeItem>(`/linktree/${id}/items/${itemId}`, "PATCH", input),
  deleteLinktreeItem: (id: string, itemId: string) =>
    adminRequest<void>(`/linktree/${id}/items/${itemId}`, "DELETE"),

  listUsers: () => adminRequest<ApiUser[]>("/users", "GET"),
  getUserById: (id: string) => adminRequest<ApiUser>(`/users/${id}`, "GET"),
  updateUser: (id: string, input: ApiAdminUpdateUserInput) =>
    adminRequest<ApiUser>(`/users/${id}`, "PATCH", input),
  deleteUser: (id: string) => adminRequest<void>(`/users/${id}`, "DELETE"),
} as const;
