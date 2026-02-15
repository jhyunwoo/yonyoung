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
    adminRequest<ApiGeneration>("/generations", "POST", input),
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
    adminRequest<ApiGeneration>(`/generations/${id}`, "PATCH", input),
    /**
   * deleteGeneration 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteGeneration: (id: string) => adminRequest<void>(`/generations/${id}`, "DELETE"),

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
    adminRequest<ApiActivity>("/activities", "POST", input),
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
    adminRequest<ApiActivity>(`/activities/${id}`, "PATCH", input),
    /**
   * deleteActivity 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteActivity: (id: string) => adminRequest<void>(`/activities/${id}`, "DELETE"),
    /**
   * addActivityImage의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addActivityImage: (id: string, input: ApiCreateActivityImageInput) =>
    adminRequest<ApiActivityImage>(`/activities/${id}/images`, "POST", input),
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
  ) => adminRequest<ApiActivityImage>(`/activities/${id}/images/${imageId}`, "PATCH", input),
    /**
   * deleteActivityImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param imageId 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteActivityImage: (id: string, imageId: string) =>
    adminRequest<void>(`/activities/${id}/images/${imageId}`, "DELETE"),

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
    adminRequest<ApiSupporter>("/supporters", "POST", input),
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
    adminRequest<ApiSupporter>(`/supporters/${id}`, "PATCH", input),
    /**
   * deleteSupporter 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteSupporter: (id: string) => adminRequest<void>(`/supporters/${id}`, "DELETE"),

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
    adminRequest<ApiExhibition>("/exhibitions", "POST", input),
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
    adminRequest<ApiExhibition>(`/exhibitions/${id}`, "PATCH", input),
    /**
   * deleteExhibition 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteExhibition: (id: string) => adminRequest<void>(`/exhibitions/${id}`, "DELETE"),
    /**
   * addExhibitionImage의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addExhibitionImage: (id: string, input: ApiCreateExhibitionImageInput) =>
    adminRequest<ApiExhibitionImage>(`/exhibitions/${id}/images`, "POST", input),
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
  ) => adminRequest<ApiExhibitionImage>(`/exhibitions/${id}/images/${imageId}`, "PATCH", input),
    /**
   * deleteExhibitionImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param imageId 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteExhibitionImage: (id: string, imageId: string) =>
    adminRequest<void>(`/exhibitions/${id}/images/${imageId}`, "DELETE"),

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
    adminRequest<ApiLinktree>("/linktree", "POST", input),
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
    adminRequest<ApiLinktree>(`/linktree/${id}`, "PATCH", input),
    /**
   * deleteLinktree 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteLinktree: (id: string) => adminRequest<void>(`/linktree/${id}`, "DELETE"),
    /**
   * addLinktreeItem의 핵심 비즈니스 로직을 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  addLinktreeItem: (id: string, input: ApiCreateLinktreeItemInput) =>
    adminRequest<ApiLinktreeItem>(`/linktree/${id}/items`, "POST", input),
    /**
   * updateLinktreeItem 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param itemId 대상을 식별하기 위한 ID 값입니다.
   * @param input 함수 로직에서 사용하는 입력값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  updateLinktreeItem: (id: string, itemId: string, input: ApiUpdateLinktreeItemInput) =>
    adminRequest<ApiLinktreeItem>(`/linktree/${id}/items/${itemId}`, "PATCH", input),
    /**
   * deleteLinktreeItem 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @param itemId 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteLinktreeItem: (id: string, itemId: string) =>
    adminRequest<void>(`/linktree/${id}/items/${itemId}`, "DELETE"),

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
  updateUser: (id: string, input: ApiAdminUpdateUserInput) =>
    adminRequest<ApiUser>(`/users/${id}`, "PATCH", input),
    /**
   * deleteUser 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
   * @param id 대상을 식별하기 위한 ID 값입니다.
   * @returns 처리 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  deleteUser: (id: string) => adminRequest<void>(`/users/${id}`, "DELETE"),
} as const;
