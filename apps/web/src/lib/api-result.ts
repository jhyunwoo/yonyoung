import type { ClientResponse } from "hono/client";

interface ErrorEnvelope {
  error?: {
    message?: string;
    details?: unknown;
  };
}

interface DataEnvelope<T> {
  data: T;
}

async function readJsonSafely<T>(response: ClientResponse<T>): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

type UnwrappableResponse<T> =
  | ClientResponse<DataEnvelope<T> | ErrorEnvelope>
  | Promise<ClientResponse<DataEnvelope<T> | ErrorEnvelope>>;

export async function unwrapData<T>(responseLike: UnwrappableResponse<T>) {
  const response = await responseLike;
  const payload = (await readJsonSafely(response)) as DataEnvelope<T> | ErrorEnvelope | null;

  if (!response.ok) {
    const message = payload && "error" in payload ? payload.error?.message : undefined;
    throw new Error(message ?? `API request failed: ${response.status}`);
  }

  if (!payload || !("data" in payload)) {
    throw new Error("Invalid API response payload");
  }

  return payload.data;
}

export async function unwrapDataOrFallback<T>(
  responsePromise: UnwrappableResponse<T>,
  fallback: T
): Promise<T> {
  try {
    const response = await responsePromise;
    return await unwrapData<T>(response);
  } catch {
    return fallback;
  }
}
