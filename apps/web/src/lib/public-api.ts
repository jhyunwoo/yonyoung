import type {
  ApiActivity,
  ApiExhibition,
  ApiGeneration,
  ApiLinktree,
  ApiLinktreeItem,
  ApiSupporter,
} from "./admin-api/types";

const DEFAULT_AUTH_API_URL = "http://localhost:8787";
const REQUEST_TIMEOUT_MS = 10_000;

type PublicApiDataEnvelope<T> = {
  data: T;
};

type PublicGetOptions = {
  useNoStore?: boolean;
};

export type PublicLinkItem = ApiLinktreeItem & {
  groupName: string;
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const resolvePublicApiBaseUrl = (): string => {
  return normalizeBaseUrl(
    process.env.AUTH_API_URL ??
      process.env.NEXT_PUBLIC_AUTH_API_URL ??
      DEFAULT_AUTH_API_URL,
  );
};

const resolvePublicApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolvePublicApiBaseUrl()}${normalizedPath}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseEnvelope = <T>(value: unknown): T => {
  if (!isRecord(value) || !("data" in value)) {
    throw new Error("공개 API 응답 형식이 올바르지 않습니다.");
  }
  return (value as PublicApiDataEnvelope<T>).data;
};

const publicGet = async <T>(
  path: string,
  options?: PublicGetOptions,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const requestCacheOptions = options?.useNoStore
    ? ({ cache: "no-store" } as const)
    : ({ next: { revalidate: 60 } } as const);

  try {
    const response = await fetch(resolvePublicApiUrl(path), {
      method: "GET",
      ...requestCacheOptions,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`공개 API 요청 실패 (${response.status})`);
    }

    const body = (await response.json()) as unknown;
    return parseEnvelope<T>(body);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const listPublicActivities = async (): Promise<ApiActivity[]> =>
  publicGet<ApiActivity[]>("/api/public/activities");

export const listPublicExhibitions = async (): Promise<ApiExhibition[]> =>
  publicGet<ApiExhibition[]>("/api/public/exhibitions");

export const listPublicSupporters = async (): Promise<ApiSupporter[]> =>
  publicGet<ApiSupporter[]>("/api/public/supporters", { useNoStore: true });

export const listPublicLinktrees = async (): Promise<ApiLinktree[]> =>
  publicGet<ApiLinktree[]>("/api/public/linktree");

export const listPublicGenerations = async (): Promise<ApiGeneration[]> =>
  publicGet<ApiGeneration[]>("/api/public/generations");

export const flattenLinktreeItems = (
  linktrees: ApiLinktree[],
): PublicLinkItem[] => {
  return linktrees.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupName: group.name,
    })),
  );
};

export const safeList = async <T>(loader: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await loader();
  } catch {
    return fallback;
  }
};
