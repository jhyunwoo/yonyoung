import { adminRequest } from "./http";
import { ADMIN_CACHE_TAGS, type AdminCacheTag } from "../admin-cache";
import type {
  ApiActivity,
  ApiActivityImage,
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
  ApiUpdateActivityImageBatchItemInput,
  ApiUpdateActivityInput,
  ApiUpdateExhibitionImageInput,
  ApiUpdateExhibitionImageBatchItemInput,
  ApiUpdateExhibitionInput,
  ApiUpdateGenerationInput,
  ApiUpdateLinktreeInput,
  ApiUpdateLinktreeItemInput,
  ApiUpdateSupporterInput,
  ApiUpdateUserInput,
  ApiUser,
} from "./types";

const ADMIN_REVALIDATE_ENDPOINT = "/api/admin/revalidate";

const revalidateAdminCache = async (tags: readonly AdminCacheTag[]): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch(ADMIN_REVALIDATE_ENDPOINT, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ tags }),
    });
  } catch {
    // 재검증 호출 실패는 변이 성공을 막지 않는다.
  }
};

const withAdminCacheRevalidation = async <T>(
  operation: () => Promise<T>,
  tags: readonly AdminCacheTag[],
): Promise<T> => {
  const result = await operation();
  await revalidateAdminCache(tags);
  return result;
};

export const adminResourceApi = {
    /**
   * listGenerations의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  listGenerations: () => adminRequest<ApiGeneration[]>("/generations", "GET"),
    /**
   * createGeneration 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  createGeneration: (input: ApiCreateGenerationInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiGeneration>("/generations", "POST", input),
      [ADMIN_CACHE_TAGS.generations, ADMIN_CACHE_TAGS.users],
    ),
    /**
   * getGenerationById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getGenerationById: (id: string) =>
    adminRequest<ApiGeneration>(`/generations/${id}`, "GET"),
    /**
   * updateGeneration 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateGeneration: (id: string, input: ApiUpdateGenerationInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiGeneration>(`/generations/${id}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.generations, ADMIN_CACHE_TAGS.users],
    ),
    /**
   * deleteGeneration 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteGeneration: (id: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/generations/${id}`, "DELETE"),
      [ADMIN_CACHE_TAGS.generations, ADMIN_CACHE_TAGS.users],
    ),

    /**
   * listActivities의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  listActivities: () => adminRequest<ApiActivity[]>("/activities", "GET"),
    /**
   * createActivity 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  createActivity: (input: ApiCreateActivityInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiActivity>("/activities", "POST", input),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * getActivityById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getActivityById: (id: string) => adminRequest<ApiActivity>(`/activities/${id}`, "GET"),
    /**
   * updateActivity 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateActivity: (id: string, input: ApiUpdateActivityInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiActivity>(`/activities/${id}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * deleteActivity 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteActivity: (id: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/activities/${id}`, "DELETE"),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * addActivityImage의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addActivityImage: (id: string, input: ApiCreateActivityImageInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiActivityImage>(`/activities/${id}/images`, "POST", input),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * addActivityImages의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param inputs 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addActivityImages: (id: string, inputs: ApiCreateActivityImageInput[]) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiActivityImage[]>(`/activities/${id}/images/batch`, "POST", inputs),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * updateActivityImage 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param imageId 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateActivityImage: (
    id: string,
    imageId: string,
    input: ApiUpdateActivityImageInput,
  ) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiActivityImage>(`/activities/${id}/images/${imageId}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * updateActivityImages 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param inputs 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateActivityImages: (
    id: string,
    inputs: ApiUpdateActivityImageBatchItemInput[],
  ) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiActivityImage[]>(`/activities/${id}/images/batch`, "PATCH", inputs),
      [ADMIN_CACHE_TAGS.activities],
    ),
    /**
   * deleteActivityImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param imageId 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteActivityImage: (id: string, imageId: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/activities/${id}/images/${imageId}`, "DELETE"),
      [ADMIN_CACHE_TAGS.activities],
    ),

    /**
   * listSupporters의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  listSupporters: () => adminRequest<ApiSupporter[]>("/supporters", "GET"),
    /**
   * createSupporter 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  createSupporter: (input: ApiCreateSupporterInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiSupporter>("/supporters", "POST", input),
      [ADMIN_CACHE_TAGS.supporters],
    ),
    /**
   * getSupporterById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getSupporterById: (id: string) =>
    adminRequest<ApiSupporter>(`/supporters/${id}`, "GET"),
    /**
   * updateSupporter 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateSupporter: (id: string, input: ApiUpdateSupporterInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiSupporter>(`/supporters/${id}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.supporters],
    ),
    /**
   * deleteSupporter 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteSupporter: (id: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/supporters/${id}`, "DELETE"),
      [ADMIN_CACHE_TAGS.supporters],
    ),

    /**
   * listExhibitions의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  listExhibitions: () => adminRequest<ApiExhibition[]>("/exhibitions", "GET"),
    /**
   * createExhibition 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  createExhibition: (input: ApiCreateExhibitionInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiExhibition>("/exhibitions", "POST", input),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * getExhibitionById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getExhibitionById: (id: string) =>
    adminRequest<ApiExhibition>(`/exhibitions/${id}`, "GET"),
    /**
   * updateExhibition 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateExhibition: (id: string, input: ApiUpdateExhibitionInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiExhibition>(`/exhibitions/${id}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * deleteExhibition 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteExhibition: (id: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/exhibitions/${id}`, "DELETE"),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * addExhibitionImage의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addExhibitionImage: (id: string, input: ApiCreateExhibitionImageInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiExhibitionImage>(`/exhibitions/${id}/images`, "POST", input),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * addExhibitionImages의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param inputs 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addExhibitionImages: (id: string, inputs: ApiCreateExhibitionImageInput[]) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiExhibitionImage[]>(`/exhibitions/${id}/images/batch`, "POST", inputs),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * updateExhibitionImage 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param imageId 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateExhibitionImage: (
    id: string,
    imageId: string,
    input: ApiUpdateExhibitionImageInput,
  ) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiExhibitionImage>(`/exhibitions/${id}/images/${imageId}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * updateExhibitionImages 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param inputs 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateExhibitionImages: (
    id: string,
    inputs: ApiUpdateExhibitionImageBatchItemInput[],
  ) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiExhibitionImage[]>(`/exhibitions/${id}/images/batch`, "PATCH", inputs),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),
    /**
   * deleteExhibitionImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param imageId 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteExhibitionImage: (id: string, imageId: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/exhibitions/${id}/images/${imageId}`, "DELETE"),
      [ADMIN_CACHE_TAGS.exhibitions],
    ),

    /**
   * listLinktrees의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  listLinktrees: () => adminRequest<ApiLinktree[]>("/linktree", "GET"),
    /**
   * createLinktree 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  createLinktree: (input: ApiCreateLinktreeInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiLinktree>("/linktree", "POST", input),
      [ADMIN_CACHE_TAGS.linktree],
    ),
    /**
   * getLinktreeById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getLinktreeById: (id: string) => adminRequest<ApiLinktree>(`/linktree/${id}`, "GET"),
    /**
   * updateLinktree 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateLinktree: (id: string, input: ApiUpdateLinktreeInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiLinktree>(`/linktree/${id}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.linktree],
    ),
    /**
   * deleteLinktree 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteLinktree: (id: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/linktree/${id}`, "DELETE"),
      [ADMIN_CACHE_TAGS.linktree],
    ),
    /**
   * addLinktreeItem의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addLinktreeItem: (id: string, input: ApiCreateLinktreeItemInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiLinktreeItem>(`/linktree/${id}/items`, "POST", input),
      [ADMIN_CACHE_TAGS.linktree],
    ),
    /**
   * updateLinktreeItem 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param itemId 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateLinktreeItem: (id: string, itemId: string, input: ApiUpdateLinktreeItemInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiLinktreeItem>(`/linktree/${id}/items/${itemId}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.linktree],
    ),
    /**
   * deleteLinktreeItem 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param itemId 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteLinktreeItem: (id: string, itemId: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/linktree/${id}/items/${itemId}`, "DELETE"),
      [ADMIN_CACHE_TAGS.linktree],
    ),

    /**
   * listUsers의 핵심 비즈니스 로직을 수행합니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  listUsers: () => adminRequest<ApiUser[]>("/users", "GET"),
    /**
   * getUserById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  getUserById: (id: string) => adminRequest<ApiUser>(`/users/${id}`, "GET"),
    /**
   * updateUser 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateUser: (id: string, input: ApiUpdateUserInput) =>
    withAdminCacheRevalidation(
      () => adminRequest<ApiUser>(`/users/${id}`, "PATCH", input),
      [ADMIN_CACHE_TAGS.users, ADMIN_CACHE_TAGS.generations],
    ),
    /**
   * deleteUser 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteUser: (id: string) =>
    withAdminCacheRevalidation(
      () => adminRequest<void>(`/users/${id}`, "DELETE"),
      [ADMIN_CACHE_TAGS.users, ADMIN_CACHE_TAGS.generations],
    ),
} as const;
