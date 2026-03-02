import { cookies } from "next/headers";
import { resolveAuthApiUrl } from "@/features/auth/server/auth-server";
import { ADMIN_CACHE_TAGS } from "@/features/dashboard/cache/admin-cache";
import type { ApiGeneration } from "@/features/dashboard/api/admin-api/types";

const PUBLIC_GENERATIONS_PATH = "/api/public/generations";

type DataEnvelope<T> = {
  data: T;
};

/**
 * isGeneration 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param value 함수 로직에서 사용하는 입력값입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const isGeneration = (value: unknown): value is ApiGeneration => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sortOrder === "number"
  );
};

/**
 * parseGenerationList 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
 * @param payload 함수 로직에서 사용하는 입력값입니다.
 * @returns 조회/계산된 결과 값을 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const parseGenerationList = (payload: unknown): ApiGeneration[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isGeneration);
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    "data" in payload &&
    Array.isArray((payload as DataEnvelope<unknown>).data)
  ) {
    return ((payload as DataEnvelope<unknown[]>).data ?? []).filter(isGeneration);
  }

  return [];
};

/**
 * readServerCookieHeader 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
 * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
export const readServerCookieHeader = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader.length > 0 ? cookieHeader : null;
};

/**
 * fetchGenerationsFromServer 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
 * @param cookieHeader 함수 로직에서 사용하는 입력값입니다.
 * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
 * @remarks 네트워크 실패/타임아웃 상황을 고려해 예외 처리와 기본값 규약을 유지해야 합니다.
 */
export const fetchGenerationsFromServer = async (
  cookieHeader: string | null,
): Promise<ApiGeneration[]> => {
  void cookieHeader;

  try {
    const response = await fetch(`${resolveAuthApiUrl()}${PUBLIC_GENERATIONS_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: {
        tags: [ADMIN_CACHE_TAGS.generations],
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(/** response.json().catch 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => null)) as unknown;
    return parseGenerationList(payload);
  } catch {
    return [];
  }
};
