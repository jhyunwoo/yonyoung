import { isPresidentRole } from "./auth-shared";
import type { ApiGeneration } from "./admin-api/types";

type GenerationLike = Pick<ApiGeneration, "id" | "name" | "sortOrder">;
type SessionWithGenerationRole =
  | {
      user?: Record<string, unknown> | null;
    }
  | null
  | undefined;

/**
 * sortBySortOrder의 핵심 비즈니스 로직을 수행합니다.
 * @param generations 함수 로직에서 사용하는 입력값입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const sortBySortOrder = <T extends GenerationLike>(generations: T[]): T[] => {
  return [...generations].sort(/** [...generations].sort 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param a 함수 로직에서 사용하는 입력값입니다. @param b 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (a, b) => {
    if (a.sortOrder === b.sortOrder) {
      return a.name.localeCompare(b.name);
    }
    return a.sortOrder - b.sortOrder;
  });
};

/**
 * parseSortOrder 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const parseSortOrder = (value: string | number): number | null => {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * getAccessibleGenerations 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param session 인증/인가 상태를 포함한 세션 정보입니다.
 * @param generations 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const getAccessibleGenerations = <T extends GenerationLike>(
  session: SessionWithGenerationRole,
  generations: T[],
): T[] => {
  const user = session?.user;
  if (!user || typeof user !== "object") {
    return [];
  }

  const sorted = sortBySortOrder(generations);
  const role = user.role;
  if (isPresidentRole(role)) {
    return sorted;
  }

  const ownGenerationId =
    typeof user.generationId === "string" ? user.generationId : null;
  if (!ownGenerationId) {
    return [];
  }

  return sorted.filter(/** sorted.filter 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => generation.id === ownGenerationId);
};

/**
 * resolveGenerationBySortOrder 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param generations 함수 로직에서 사용하는 입력값입니다.
 * @param sortOrderParam 동작 분기를 제어하는 파라미터입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const resolveGenerationBySortOrder = <T extends GenerationLike>(
  generations: T[],
  sortOrderParam: string | number,
): T | null => {
  const sortOrder = parseSortOrder(sortOrderParam);
  if (sortOrder === null) {
    return null;
  }

  return (
    generations.find(/** generations.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => generation.sortOrder === sortOrder) ?? null
  );
};

/**
 * buildGenerationPath 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param sortOrder 함수 로직에서 사용하는 입력값입니다.
 * @param resourcePath 응답 데이터 또는 응답 객체입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const buildGenerationPath = (
  sortOrder: number | string,
  resourcePath?: string | null,
): string => {
  const normalizedSortOrder = String(sortOrder).trim();
  if (!resourcePath) {
    return `/admin/${normalizedSortOrder}`;
  }

  const normalizedResourcePath = resourcePath.replace(/^\/+/, "");
  if (!normalizedResourcePath) {
    return `/admin/${normalizedSortOrder}`;
  }

  return `/admin/${normalizedSortOrder}/${normalizedResourcePath}`;
};

/**
 * extractGenerationRouteContext의 핵심 비즈니스 로직을 수행합니다.
 * @param pathname 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @returns 함수 실행 결과를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const extractGenerationRouteContext = (
  pathname: string,
): {
  sortOrder: number | null;
  resourcePath: string | null;
} => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin" || parts.length < 2) {
    return {
      sortOrder: null,
      resourcePath: null,
    };
  }

  const parsedSortOrder = parseSortOrder(parts[1] ?? "");
  if (parsedSortOrder === null) {
    return {
      sortOrder: null,
      resourcePath: null,
    };
  }

  const resourcePath = parts.slice(2).join("/");
  return {
    sortOrder: parsedSortOrder,
    resourcePath: resourcePath.length > 0 ? resourcePath : null,
  };
};
