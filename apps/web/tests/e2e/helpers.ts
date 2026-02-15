import { request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext, APIResponse, Page } from "@playwright/test";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";
const ADMIN_API_BASE_PATH = "/api";

const resolveWebOrigin = (): string => {
  const fallback = "http://localhost:3000";
  const baseUrl = process.env.E2E_BASE_URL ?? fallback;

  try {
    return new URL(baseUrl).origin;
  } catch {
    return fallback;
  }
};

const buildAuthHeaders = (): Record<string, string> => {
  const origin = resolveWebOrigin();
  return {
    Origin: origin,
    Referer: `${origin}/`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
};

const readJsonSafe = async (response: APIResponse) => {
  const contentType = response.headers()["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const unwrapData = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const readErrorMessage = (
  payload: unknown,
  fallback: string,
): string => {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
};

export const adminApiRequest = async <T>(
  request: APIRequestContext,
  input: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    data?: unknown;
    failSilently?: boolean;
  },
): Promise<T> => {
  const targetUrl = `${API_BASE_URL}${ADMIN_API_BASE_PATH}${input.path}`;

  const response =
    input.method === "GET"
      ? await request.get(targetUrl)
      : input.method === "POST"
        ? await request.post(targetUrl, { data: input.data })
        : input.method === "PATCH"
          ? await request.patch(targetUrl, { data: input.data })
          : await request.delete(targetUrl);

  if (response.status() === 204) {
    return undefined as T;
  }

  const payload = await readJsonSafe(response);

  if (!response.ok()) {
    if (input.failSilently) {
      return undefined as T;
    }

    const message = readErrorMessage(
      payload,
      `Admin API failed: ${response.status()} ${response.statusText()}`,
    );

    throw new Error(message);
  }

  return unwrapData<T>(payload);
};

type FileUploadFlow = "auto" | "always" | "never";

const parseFileUploadFlow = (): FileUploadFlow => {
  const value = process.env.E2E_FILE_UPLOAD_FLOW?.trim().toLowerCase();
  if (!value) {
    return "auto";
  }

  if (["1", "true", "yes", "on", "always"].includes(value)) {
    return "always";
  }

  if (["0", "false", "no", "off", "never"].includes(value)) {
    return "never";
  }

  return "auto";
};

let uploadFlowAvailabilityPromise: Promise<boolean> | null = null;

export const shouldRunFileUploadFlow = async (
  request: APIRequestContext,
): Promise<boolean> => {
  const flow = parseFileUploadFlow();
  if (flow === "always") {
    return true;
  }
  if (flow === "never") {
    return false;
  }

  if (!uploadFlowAvailabilityPromise) {
    uploadFlowAvailabilityPromise = (async () => {
      const response = await request.post(
        `${API_BASE_URL}${ADMIN_API_BASE_PATH}/activities/presign/cover`,
        {
          data: {
            fileName: "e2e-upload-probe.png",
            contentType: "image/png",
          },
        },
      );

      if (response.status() === 201) {
        const payload = await readJsonSafe(response);
        const presign = unwrapData<{
          uploadUrl?: string;
          requiredHeaders?: {
            "Content-Type"?: string;
          };
        } | null>(payload);

        if (!presign?.uploadUrl) {
          return false;
        }

        try {
          const uploadProbe = await request.fetch(presign.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type":
                presign.requiredHeaders?.["Content-Type"] ?? "image/png",
            },
            data: Buffer.from("e2e-upload-probe"),
          });
          return uploadProbe.ok();
        } catch {
          return false;
        }
      }

      if (response.status() === 404 || response.status() === 500) {
        return false;
      }

      if (!response.ok()) {
        const payload = await readJsonSafe(response);
        throw new Error(
          readErrorMessage(
            payload,
            `Upload flow probe failed: ${response.status()} ${response.statusText()}`,
          ),
        );
      }

      return false;
    })();
  }

  return uploadFlowAvailabilityPromise;
};

export const uniqueText = (prefix: string, label: string): string =>
  `${prefix}-${label}-${Math.random().toString(36).slice(2, 8)}`;

export const ensureAdminSession = async (page: Page): Promise<void> => {
  const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8787";
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD 환경변수가 필요합니다.");
  }

  const verifySession = async () => {
    const response = await page.request.get(`${apiUrl}/api/auth/get-session`);
    if (!response.ok()) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          user?: {
            role?: string | null;
          };
        }
      | null;

    return payload?.user?.role === "president";
  };

  if (await verifySession()) {
    return;
  }

  const signInResponse = await page.request.post(
    `${apiUrl}/api/auth/sign-in/email`,
    {
      headers: buildAuthHeaders(),
      data: {
        email: adminEmail,
        password: adminPassword,
        rememberMe: true,
      },
    },
  );

  if (!signInResponse.ok()) {
    const payload = await readJsonSafe(signInResponse);
    throw new Error(
      readErrorMessage(
        payload,
        `Failed to sign in admin session (${signInResponse.status()})`,
      ),
    );
  }

  if (!(await verifySession())) {
    throw new Error("Admin session verification failed after sign-in.");
  }
};

export const pickFirstSelectOption = async (
  page: Page,
  testId: string,
): Promise<string> => {
  const select = page.getByTestId(testId);
  await select.waitFor();

  const value = await select.evaluate((element) => {
    const selectElement = element as unknown as HTMLSelectElement;
    const option = Array.from(selectElement.options).find((candidate) => candidate.value);
    return option?.value ?? "";
  });

  if (!value) {
    throw new Error(`No selectable option found for ${testId}`);
  }

  return value;
};

export const ensureGeneration = async (
  request: APIRequestContext,
  prefix: string,
): Promise<{ id: string; name: string; sortOrder: number }> => {
  const name = uniqueText(prefix, "generation");
  const createWithSortOrder = async (sortOrder: number) => {
    return adminApiRequest<{
      id: string;
      name: string;
      sortOrder: number;
    }>(request, {
      method: "POST",
      path: "/generations",
      data: {
        name,
        sortOrder,
        startDate: Date.parse("2030-01-01T00:00:00.000Z"),
        endDate: Date.parse("2030-12-31T00:00:00.000Z"),
      },
    });
  };

  const createSortOrder = (): number => {
    const timestampPart = Date.now() % 1_000_000;
    const randomPart = Math.floor(Math.random() * 1_000);
    return timestampPart * 1_000 + randomPart;
  };

  let lastError: unknown;
  for (let index = 0; index < 5; index += 1) {
    try {
      return await createWithSortOrder(createSortOrder());
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const cleanupByPrefix = async (
  request: APIRequestContext,
  prefix: string,
): Promise<void> => {
  const safeList = async <T>(path: string): Promise<T[]> => {
    try {
      const data = await adminApiRequest<T[]>(request, {
        method: "GET",
        path,
        failSilently: true,
      });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const activities = await safeList<{ id: string; title: string }>("/activities");
  for (const activity of activities) {
    if (activity.title.includes(prefix)) {
      await adminApiRequest<void>(request, {
        method: "DELETE",
        path: `/activities/${activity.id}`,
        failSilently: true,
      });
    }
  }

  const exhibitions = await safeList<{ id: string; title: string }>("/exhibitions");
  for (const exhibition of exhibitions) {
    if (exhibition.title.includes(prefix)) {
      await adminApiRequest<void>(request, {
        method: "DELETE",
        path: `/exhibitions/${exhibition.id}`,
        failSilently: true,
      });
    }
  }

  const supporters = await safeList<{ id: string; name: string }>("/supporters");
  for (const supporter of supporters) {
    if (supporter.name.includes(prefix)) {
      await adminApiRequest<void>(request, {
        method: "DELETE",
        path: `/supporters/${supporter.id}`,
        failSilently: true,
      });
    }
  }

  const linktrees = await safeList<{ id: string; name: string }>("/linktree");
  for (const linktree of linktrees) {
    if (linktree.name.includes(prefix)) {
      await adminApiRequest<void>(request, {
        method: "DELETE",
        path: `/linktree/${linktree.id}`,
        failSilently: true,
      });
    }
  }

  const users = await safeList<{
    id: string;
    name: string;
    email: string;
    nickname: string | null;
  }>("/users");
  for (const user of users) {
    const isOwnedByPrefix =
      user.name.includes(prefix) ||
      user.email.includes(prefix) ||
      (user.nickname ? user.nickname.includes(prefix) : false);

    if (isOwnedByPrefix) {
      await adminApiRequest<void>(request, {
        method: "DELETE",
        path: `/users/${user.id}`,
        failSilently: true,
      });
    }
  }

  const generations = await safeList<{ id: string; name: string }>("/generations");
  for (const generation of generations) {
    if (generation.name.includes(prefix)) {
      await adminApiRequest<void>(request, {
        method: "DELETE",
        path: `/generations/${generation.id}`,
        failSilently: true,
      });
    }
  }
};

export const signUpTemporaryUser = async (prefix: string) => {
  const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8787";
  const email = `${uniqueText(prefix, "user")}@example.com`;
  const password = `Test!${Date.now()}aA`;
  const name = uniqueText(prefix, "name");

  const isolatedContext = await playwrightRequest.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: buildAuthHeaders(),
  });

  try {
    const response = await isolatedContext.post("/api/auth/sign-up/email", {
      data: {
        name,
        email,
        password,
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          user?: {
            id?: string;
          };
          message?: string;
          error?: {
            message?: string;
          };
        }
      | null;

    if (!response.ok()) {
      throw new Error(
        readErrorMessage(payload, `Temp user sign-up failed (${response.status()})`),
      );
    }

    const userId = payload?.user?.id;
    if (!userId) {
      throw new Error("Temp user sign-up response does not include user id.");
    }

    return {
      id: userId,
      email,
      password,
      name,
    };
  } finally {
    await isolatedContext.dispose();
  }
};
