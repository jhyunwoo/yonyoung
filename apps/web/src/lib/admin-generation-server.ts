import { cookies } from "next/headers";
import { resolveAuthApiUrl } from "./auth-server";
import type { ApiGeneration } from "./admin-api/types";

const GENERATIONS_PATH = "/api/generations";

type DataEnvelope<T> = {
  data: T;
};

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

export const readServerCookieHeader = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return cookieHeader.length > 0 ? cookieHeader : null;
};

export const fetchGenerationsFromServer = async (
  cookieHeader: string | null,
): Promise<ApiGeneration[]> => {
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  try {
    const response = await fetch(`${resolveAuthApiUrl()}${GENERATIONS_PATH}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return parseGenerationList(payload);
  } catch {
    return [];
  }
};

