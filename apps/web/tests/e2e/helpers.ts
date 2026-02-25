import { request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext, APIResponse, Page } from "@playwright/test";
import { readE2eRoleMatrixMode, readE2eUploadMode } from "./env";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:8787";
const ADMIN_API_BASE_PATH = "/api";
const E2E_API_REQUEST_TIMEOUT_MS = 30_000;
const E2E_API_RETRY_COUNT = 6;
const E2E_API_RETRY_DELAY_MS = 400;

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

const isNotFoundApiPayload = (status: number, payload: unknown): boolean => {
  if (status !== 404) {
    return false;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "code" in payload.error &&
    payload.error.code === "NOT_FOUND"
  ) {
    return true;
  }

  const message = readErrorMessage(payload, "");
  return message.includes("대상을 찾을 수 없습니다.");
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const isTransientAdminApiFailure = (
  status: number,
): boolean => {
  if (status >= 500 && status <= 599) {
    return true;
  }

  return false;
};

const adminApiRequest = async <T>(
  request: APIRequestContext,
  input: {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    data?: unknown;
    failSilently?: boolean;
  },
): Promise<T> => {
  const targetUrl = `${API_BASE_URL}${ADMIN_API_BASE_PATH}${input.path}`;
  let lastMessage = "Admin API failed";
  let lastStatus = 0;
  let lastStatusText = "";

  for (let attempt = 1; attempt <= E2E_API_RETRY_COUNT; attempt += 1) {
    const response =
      input.method === "GET"
        ? await request.get(targetUrl, { timeout: E2E_API_REQUEST_TIMEOUT_MS })
        : input.method === "POST"
          ? await request.post(targetUrl, {
              data: input.data,
              timeout: E2E_API_REQUEST_TIMEOUT_MS,
            })
          : input.method === "PATCH"
            ? await request.patch(targetUrl, {
                data: input.data,
                timeout: E2E_API_REQUEST_TIMEOUT_MS,
              })
            : await request.delete(targetUrl, { timeout: E2E_API_REQUEST_TIMEOUT_MS });

    if (response.status() === 204) {
      return undefined as T;
    }

    const payload = await readJsonSafe(response);

    if (response.ok()) {
      return unwrapData<T>(payload);
    }

    if (input.failSilently) {
      return undefined as T;
    }

    lastStatus = response.status();
    lastStatusText = response.statusText();
    lastMessage = readErrorMessage(
      payload,
      `Admin API failed: ${response.status()} ${response.statusText()}`,
    );
    const shouldRetry =
      attempt < E2E_API_RETRY_COUNT &&
      isTransientAdminApiFailure(response.status());

    if (!shouldRetry) {
      throw new Error(
        `${input.method} ${input.path} failed (${lastStatus} ${lastStatusText}): ${lastMessage}`,
      );
    }

    await delay(E2E_API_RETRY_DELAY_MS * attempt);
  }

  throw new Error(
    `${input.method} ${input.path} failed (${lastStatus} ${lastStatusText}): ${lastMessage}`,
  );
};

type FileUploadFlow = "auto" | "file" | "url";

const parseFileUploadFlow = (): FileUploadFlow => {
  const value = process.env.E2E_FILE_UPLOAD_FLOW?.trim().toLowerCase();
  if (!value) {
    return "auto";
  }

  if (["1", "true", "yes", "on", "always", "file"].includes(value)) {
    return "file";
  }

  if (["0", "false", "no", "off", "never", "url"].includes(value)) {
    return "url";
  }

  return "auto";
};

type UploadMockResource = "activities" | "exhibitions" | "supporters" | "users";
type UploadMockSlot = "cover" | "detail" | "logo" | "profile";
type PresignPayload = Record<string, unknown> | null;

type UploadMockRouteInput = {
  key: string;
  presignPath: string;
  resource: UploadMockResource;
  slot: UploadMockSlot;
  contentType?: string;
  requiredHeaders?: Record<string, string>;
  uploadDelayMs?: number;
  failPresignAttempts?: number;
  failUploadAttempts?: number;
};

type UploadMockRouteState = UploadMockRouteInput & {
  presignAttemptCount: number;
  uploadAttemptCount: number;
};

type UploadRequestSnapshot = {
  url: string;
  method: string;
  headers: Record<string, string>;
};

type UploadMockLogs = {
  presignPayloads: Map<string, PresignPayload[]>;
  uploadRequests: Map<string, UploadRequestSnapshot[]>;
};

const MOCK_UPLOAD_BASE_URL = "https://upload.e2e.invalid";
const MOCK_STORAGE_BASE_URL = "https://storage.yonyoung.moveto.kr";

const parseJsonBody = (raw: string | null): PresignPayload => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const ensureLogList = <T>(
  map: Map<string, T[]>,
  key: string,
): T[] => {
  const current = map.get(key);
  if (current) {
    return current;
  }

  const created: T[] = [];
  map.set(key, created);
  return created;
};

const toHeaderList = (headers: Iterable<string>): string =>
  Array.from(new Set(headers))
    .map((key) => key.toLowerCase())
    .sort()
    .join(", ");

let uploadFlowAvailabilityPromise: Promise<boolean> | null = null;

const resolveRequiredUploadHeaders = (
  requiredHeaders: Record<string, string> | undefined,
  fallbackContentType: string,
): Record<string, string> => {
  const headers: Record<string, string> = {};
  let hasContentType = false;

  if (requiredHeaders) {
    for (const [key, value] of Object.entries(requiredHeaders)) {
      if (!value) {
        continue;
      }
      headers[key] = value;
      if (key.toLowerCase() === "content-type") {
        hasContentType = true;
      }
    }
  }

  if (!hasContentType) {
    headers["Content-Type"] = fallbackContentType;
  }

  return headers;
};

const probeUploadWithBrowserFetch = async (
  page: Page,
  input: { uploadUrl: string; headers: Record<string, string> },
): Promise<boolean> =>
  page.evaluate(
    async ({ uploadUrl, headers }) => {
      try {
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers,
          body: new Blob(
            ["e2e-upload-probe"],
            { type: headers["Content-Type"] ?? "application/octet-stream" },
          ),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    {
      uploadUrl: input.uploadUrl,
      headers: input.headers,
    },
  );

export const shouldRunFileUploadFlow = async (
  request: APIRequestContext,
  page?: Page,
): Promise<boolean> => {
  if (readE2eUploadMode() === "mock") {
    return false;
  }

  const flow = parseFileUploadFlow();
  if (flow === "file") {
    return true;
  }
  if (flow === "url") {
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
          requiredHeaders?: Record<string, string>;
        } | null>(payload);

        if (!presign?.uploadUrl) {
          return false;
        }

        try {
          const headers = resolveRequiredUploadHeaders(
            presign.requiredHeaders,
            "image/png",
          );

          if (page) {
            return await probeUploadWithBrowserFetch(page, {
              uploadUrl: presign.uploadUrl,
              headers,
            });
          }

          const uploadProbe = await request.fetch(presign.uploadUrl, {
            method: "PUT",
            headers,
            data: "e2e-upload-probe",
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

export const shouldUseUploadMock = (): boolean =>
  readE2eUploadMode() !== "real";

export const installPresignedUploadMock = async (
  page: Page,
  input: {
    routes: UploadMockRouteInput[];
    uploadBaseUrl?: string;
    storageBaseUrl?: string;
  },
): Promise<{
  getPresignPayloads: (key: string) => PresignPayload[];
  getUploadRequests: (key: string) => UploadRequestSnapshot[];
  getLatestPresignPayload: (key: string) => PresignPayload;
  getUploadCount: (key: string) => number;
}> => {
  const uploadBaseUrl = input.uploadBaseUrl ?? MOCK_UPLOAD_BASE_URL;
  const storageBaseUrl = input.storageBaseUrl ?? MOCK_STORAGE_BASE_URL;
  const webOrigin = resolveWebOrigin();
  const allowHeaders = new Set<string>(["content-type"]);
  const presignLogs: UploadMockLogs["presignPayloads"] = new Map();
  const uploadLogs: UploadMockLogs["uploadRequests"] = new Map();
  const presignedUrlMap = new Map<string, UploadMockRouteState>();
  const routeStates = input.routes.map((route) => ({
    ...route,
    presignAttemptCount: 0,
    uploadAttemptCount: 0,
  }));

  for (const routeState of routeStates) {
    await page.route(
      `${API_BASE_URL}${ADMIN_API_BASE_PATH}${routeState.presignPath}`,
      async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }

        const payload = parseJsonBody(route.request().postData());
        ensureLogList(presignLogs, routeState.key).push(payload);
        routeState.presignAttemptCount += 1;

        const presignShouldFail =
          routeState.failPresignAttempts !== undefined &&
          routeState.presignAttemptCount <= routeState.failPresignAttempts;
        if (presignShouldFail) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              error: {
                code: "UPLOAD_PRESIGN_FAILED",
                message: "presign mock failure",
              },
            }),
          });
          return;
        }

        const resolvedContentType =
          typeof payload?.contentType === "string"
            ? payload.contentType
            : routeState.contentType ?? "image/png";
        const resolvedHeaders = resolveRequiredUploadHeaders(
          routeState.requiredHeaders,
          resolvedContentType,
        );
        Object.keys(resolvedHeaders).forEach((key) => allowHeaders.add(key));
        const uploadToken = `${routeState.key}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const objectKey = `${routeState.resource}/${routeState.slot}/${uploadToken}.png`;
        const uploadUrl =
          `${uploadBaseUrl}/${routeState.resource}/${routeState.slot}/${uploadToken}` +
          "?X-Amz-Algorithm=AWS4-HMAC-SHA256";
        const publicUrl = `${storageBaseUrl}/${objectKey}`;

        presignedUrlMap.set(uploadUrl, routeState);

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              uploadUrl,
              objectKey,
              publicUrl,
              requiredHeaders: resolvedHeaders,
            },
          }),
        });
      },
    );
  }

  await page.route(`${uploadBaseUrl}/**`, async (route) => {
    const method = route.request().method();
    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": webOrigin,
          "access-control-allow-methods": "PUT, OPTIONS",
          "access-control-allow-headers": toHeaderList(allowHeaders),
          "access-control-max-age": "86400",
        },
      });
      return;
    }

    if (method !== "PUT") {
      await route.continue();
      return;
    }

    const uploadUrl = route.request().url();
    const matchedState = presignedUrlMap.get(uploadUrl);
    if (!matchedState) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "UPLOAD_NOT_FOUND",
            message: "mock upload url is not registered",
          },
        }),
      });
      return;
    }

    matchedState.uploadAttemptCount += 1;
    ensureLogList(uploadLogs, matchedState.key).push({
      url: uploadUrl,
      method,
      headers: route.request().headers(),
    });

    const uploadShouldFail =
      matchedState.failUploadAttempts !== undefined &&
      matchedState.uploadAttemptCount <= matchedState.failUploadAttempts;
    if (uploadShouldFail) {
      await route.fulfill({
        status: 500,
        headers: {
          "access-control-allow-origin": webOrigin,
        },
        body: "",
      });
      return;
    }

    if (matchedState.uploadDelayMs && matchedState.uploadDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, matchedState.uploadDelayMs));
    }

    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": webOrigin,
        etag: "\"mock-etag\"",
      },
      body: "",
    });
  });

  return {
    getPresignPayloads: (key) => [...(presignLogs.get(key) ?? [])],
    getUploadRequests: (key) => [...(uploadLogs.get(key) ?? [])],
    getLatestPresignPayload: (key) => {
      const payloads = presignLogs.get(key) ?? [];
      return payloads[payloads.length - 1] ?? null;
    },
    getUploadCount: (key) => uploadLogs.get(key)?.length ?? 0,
  };
};

export type E2ERole =
  | "president"
  | "vice_president"
  | "manager"
  | "member"
  | "new_member"
  | "associate_member"
  | "regular_member"
  | "unverified";

type AssignableRole =
  | "president"
  | "vice_president"
  | "manager"
  | "new_member"
  | "associate_member"
  | "regular_member"
  | "unverified";

const CORE_ROLE_MATRIX: E2ERole[] = [
  "president",
  "manager",
  "regular_member",
  "unverified",
];

const FULL_ROLE_MATRIX: E2ERole[] = [
  "president",
  "vice_president",
  "manager",
  "member",
  "new_member",
  "associate_member",
  "regular_member",
  "unverified",
];

const toAssignableRole = (role: E2ERole): AssignableRole =>
  role === "member" ? "regular_member" : role;

export const getRoleMatrixRoles = (): E2ERole[] =>
  readE2eRoleMatrixMode() === "all" ? [...FULL_ROLE_MATRIX] : [...CORE_ROLE_MATRIX];

export const uniqueText = (prefix: string, label: string): string =>
  `${prefix}-${label}-${Math.random().toString(36).slice(2, 8)}`;

export const ensureAdminSession = async (page: Page): Promise<void> => {
  const apiUrl = API_BASE_URL;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD 환경변수가 필요합니다.");
  }

  const verifySession = async () => {
    for (let attempt = 1; attempt <= E2E_API_RETRY_COUNT; attempt += 1) {
      try {
        const response = await page.request.get(`${apiUrl}/api/auth/get-session`, {
          timeout: E2E_API_REQUEST_TIMEOUT_MS,
        });
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
      } catch {
        if (attempt === E2E_API_RETRY_COUNT) {
          return false;
        }
        await delay(E2E_API_RETRY_DELAY_MS * attempt);
      }
    }

    return false;
  };

  const ensureAdminProfile = async () => {
    const session = await fetchSession(page.request);
    const userId = session?.user?.id;
    if (!userId) {
      return;
    }

    const profileResponse = await page.request.patch(`${apiUrl}/api/users/${userId}`, {
      headers: buildAuthHeaders(),
      data: {
        familyName: "E2E",
        givenName: "Admin",
        college: "공과대학",
        department: "컴퓨터과학과",
        studentNumber: "2026000001",
        phoneNumber: "010-0000-0000",
      },
      failOnStatusCode: false,
    });

    if (profileResponse.ok()) {
      return;
    }

    const payload = await readJsonSafe(profileResponse);
    if (isNotFoundApiPayload(profileResponse.status(), payload)) {
      console.warn(
        "E2E admin profile sync skipped: /api/users 대상 계정이 없어 초기화만 건너뜁니다.",
      );
      return;
    }

    const message = readErrorMessage(
      payload,
      `status=${profileResponse.status()} ${profileResponse.statusText()}`,
    );
    console.warn(`E2E admin profile sync failed (non-fatal): ${message}`);
  };

  const ensureBrowserSession = async () => {
    const canAccessDashboard = async () => {
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      return !page.url().includes("/auth/sign-in");
    };

    if (await canAccessDashboard()) {
      return;
    }

    let browserSignInResponse: APIResponse | null = null;
    for (let attempt = 1; attempt <= E2E_API_RETRY_COUNT; attempt += 1) {
      browserSignInResponse = await page.request.post(`${apiUrl}/api/auth/sign-in/email`, {
        headers: buildAuthHeaders(),
        data: {
          email: adminEmail,
          password: adminPassword,
          rememberMe: true,
        },
        timeout: E2E_API_REQUEST_TIMEOUT_MS,
        failOnStatusCode: false,
      });

      if (browserSignInResponse.ok()) {
        break;
      }

      const shouldRetry =
        attempt < E2E_API_RETRY_COUNT &&
        isTransientAdminApiFailure(browserSignInResponse.status());
      if (!shouldRetry) {
        break;
      }

      await delay(E2E_API_RETRY_DELAY_MS * attempt);
    }

    if (!browserSignInResponse?.ok()) {
      const payload = browserSignInResponse
        ? await readJsonSafe(browserSignInResponse)
        : null;
      throw new Error(
        readErrorMessage(
          payload,
          `Failed to establish browser session (${browserSignInResponse?.status() ?? "n/a"})`,
        ),
      );
    }

    if (!(await verifySession())) {
      throw new Error("Admin session verification failed while establishing browser session.");
    }

    if (!(await canAccessDashboard())) {
      throw new Error("Browser session is not established after admin sign-in.");
    }
  };

  if (await verifySession()) {
    await ensureAdminProfile();
    await ensureBrowserSession();
    return;
  }

  let signInResponse: APIResponse | null = null;
  for (let attempt = 1; attempt <= E2E_API_RETRY_COUNT; attempt += 1) {
    try {
      signInResponse = await page.request.post(`${apiUrl}/api/auth/sign-in/email`, {
        headers: buildAuthHeaders(),
        data: {
          email: adminEmail,
          password: adminPassword,
          rememberMe: true,
        },
        timeout: E2E_API_REQUEST_TIMEOUT_MS,
      });

      if (signInResponse.ok()) {
        break;
      }

      const shouldRetry =
        attempt < E2E_API_RETRY_COUNT &&
        isTransientAdminApiFailure(signInResponse.status());
      if (!shouldRetry) {
        break;
      }
    } catch {
      if (attempt === E2E_API_RETRY_COUNT) {
        throw new Error("Failed to sign in admin session: API is unreachable.");
      }
    }

    await delay(E2E_API_RETRY_DELAY_MS * attempt);
  }

  if (!signInResponse) {
    throw new Error("Failed to sign in admin session: empty API response.");
  }

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

  await ensureAdminProfile();
  await ensureBrowserSession();
};

const pickFirstSelectOption = async (
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

export const pickExistingGeneration = async (
  request: APIRequestContext,
): Promise<{ id: string; name: string; sortOrder: number }> => {
  const generations = await adminApiRequest<
    Array<{ id: string; name: string; sortOrder: number }>
  >(request, {
    method: "GET",
    path: "/generations",
  });

  if (generations.length === 0) {
    throw new Error("No existing generation found for E2E scenario.");
  }

  return generations[0] as { id: string; name: string; sortOrder: number };
};

export const seedPublicGeneration = async (
  request: APIRequestContext,
  input: {
    prefix: string;
    name?: string;
    sortOrder?: number;
    startDate?: number;
    endDate?: number;
  },
): Promise<{ id: string; name: string; sortOrder: number }> => {
  const sortOrder =
    input.sortOrder ??
    (Date.now() % 1_000_000) * 1_000 + Math.floor(Math.random() * 1_000);

  return adminApiRequest<{
    id: string;
    name: string;
    sortOrder: number;
  }>(request, {
    method: "POST",
    path: "/generations",
    data: {
      name: input.name ?? uniqueText(input.prefix, "public-generation"),
      sortOrder,
      startDate: input.startDate ?? Date.parse("2030-01-01T00:00:00.000Z"),
      endDate: input.endDate ?? Date.parse("2030-12-31T00:00:00.000Z"),
    },
  });
};

export const seedPublicActivity = async (
  request: APIRequestContext,
  input: {
    prefix: string;
    generationId: string;
    title?: string;
    description?: string;
    startDate?: number;
    endDate?: number;
    coverImageUrl?: string;
  },
): Promise<{ id: string; title: string }> => {
  return adminApiRequest<{ id: string; title: string }>(request, {
    method: "POST",
    path: "/activities",
    data: {
      title: input.title ?? uniqueText(input.prefix, "public-activity"),
      description: input.description ?? `${input.prefix} public activity description`,
      startDate: input.startDate ?? Date.parse("2099-03-01T00:00:00.000Z"),
      endDate: input.endDate ?? Date.parse("2099-03-03T00:00:00.000Z"),
      coverImageUrl:
        input.coverImageUrl ??
        `https://example.com/${input.prefix}/public-activity-cover.jpg`,
      generationId: input.generationId,
    },
  });
};

export const seedPublicExhibition = async (
  request: APIRequestContext,
  input: {
    prefix: string;
    generationId: string;
    title?: string;
    place?: string;
    description?: string;
    startDate?: number;
    endDate?: number;
    coverImageUrl?: string;
  },
): Promise<{ id: string; title: string }> => {
  return adminApiRequest<{ id: string; title: string }>(request, {
    method: "POST",
    path: "/exhibitions",
    data: {
      title: input.title ?? uniqueText(input.prefix, "public-exhibition"),
      startDate: input.startDate ?? Date.parse("2099-02-01T00:00:00.000Z"),
      endDate: input.endDate ?? Date.parse("2099-02-15T00:00:00.000Z"),
      generationId: input.generationId,
      place: input.place ?? `${input.prefix} public hall`,
      coverImageUrl:
        input.coverImageUrl ??
        `https://example.com/${input.prefix}/public-exhibition-cover.jpg`,
      description:
        input.description ?? `${input.prefix} public exhibition description`,
    },
  });
};

export const seedPublicSupporter = async (
  request: APIRequestContext,
  input: {
    prefix: string;
    name?: string;
    link?: string;
    logoUrl?: string;
    expiresAt?: number;
  },
): Promise<{ id: string; name: string }> => {
  return adminApiRequest<{ id: string; name: string }>(request, {
    method: "POST",
    path: "/supporters",
    data: {
      name: input.name ?? uniqueText(input.prefix, "public-supporter"),
      link: input.link ?? `https://example.com/${input.prefix}/public-supporter`,
      logoUrl:
        input.logoUrl ?? `https://example.com/${input.prefix}/public-supporter-logo.png`,
      expiresAt: input.expiresAt ?? Date.parse("2099-12-31T00:00:00.000Z"),
    },
  });
};

export const seedPublicLinktreeWithItems = async (
  request: APIRequestContext,
  input: {
    prefix: string;
    groupName?: string;
    items?: Array<{
      name: string;
      link: string;
    }>;
  },
): Promise<{
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    link: string;
  }>;
}> => {
  const group = await adminApiRequest<{ id: string; name: string }>(request, {
    method: "POST",
    path: "/linktree",
    data: {
      name: input.groupName ?? uniqueText(input.prefix, "public-linktree-group"),
    },
  });

  const items =
    input.items ??
    [
      {
        name: uniqueText(input.prefix, "public-link-item"),
        link: `https://example.com/${input.prefix}/public-link-item`,
      },
    ];

  const createdItems: Array<{ id: string; name: string; link: string }> = [];
  for (const item of items) {
    const created = await adminApiRequest<{ id: string; name: string; link: string }>(
      request,
      {
        method: "POST",
        path: `/linktree/${group.id}/items`,
        data: item,
      },
    );
    createdItems.push(created);
  }

  return {
    ...group,
    items: createdItems,
  };
};

const readPublicList = async <T>(
  request: APIRequestContext,
  path: string,
): Promise<T[]> => {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    timeout: E2E_API_REQUEST_TIMEOUT_MS,
  });
  if (!response.ok()) {
    return [];
  }

  const payload = await readJsonSafe(response);
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }

  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? (data as T[]) : [];
};

export const waitForPublicData = async (
  request: APIRequestContext,
  checks: Array<{
    path: string;
    label: string;
    match: (rows: unknown[]) => boolean;
  }>,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
  },
): Promise<void> => {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const intervalMs = options?.intervalMs ?? 1_000;
  const startedAt = Date.now();
  let pendingLabels = checks.map((check) => check.label);

  while (Date.now() - startedAt < timeoutMs) {
    pendingLabels = [];
    for (const check of checks) {
      const rows = await readPublicList<unknown>(request, check.path);
      if (!check.match(rows)) {
        pendingLabels.push(check.label);
      }
    }

    if (pendingLabels.length === 0) {
      return;
    }

    await delay(intervalMs);
  }

  throw new Error(`Public API sync timeout: ${pendingLabels.join(", ")}`);
};

export const cleanupByPrefix = async (
  request: APIRequestContext,
  prefix: string,
): Promise<void> => {
  const protectedUserIds = new Set<string>();
  const protectedUserEmails = new Set<string>();

  const configuredAdminEmail = process.env.E2E_ADMIN_EMAIL?.trim().toLowerCase();
  if (configuredAdminEmail) {
    protectedUserEmails.add(configuredAdminEmail);
  }

  const activeSession = await fetchSession(request).catch(() => null);
  const activeUserId = activeSession?.user?.id?.trim();
  const activeUserEmail = activeSession?.user?.email?.trim().toLowerCase();
  if (activeUserId) {
    protectedUserIds.add(activeUserId);
  }
  if (activeUserEmail) {
    protectedUserEmails.add(activeUserEmail);
  }

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
  }>("/users");
  for (const user of users) {
    const normalizedUserEmail = user.email.trim().toLowerCase();
    if (protectedUserIds.has(user.id) || protectedUserEmails.has(normalizedUserEmail)) {
      continue;
    }

    const isOwnedByPrefix =
      user.name.includes(prefix) ||
      user.email.includes(prefix);

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
  const apiUrl = API_BASE_URL;
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

type SessionPayload = {
  user?: {
    id?: string;
    email?: string;
    role?: string | null;
  };
} | null;

const fetchSession = async (
  requestContext: APIRequestContext,
): Promise<SessionPayload> => {
  const response = await requestContext.get(`${API_BASE_URL}/api/auth/get-session`);
  if (!response.ok()) {
    return null;
  }

  return (await response.json().catch(() => null)) as SessionPayload;
};

const signOutCurrentSession = async (
  requestContext: APIRequestContext,
): Promise<void> => {
  await requestContext.post(`${API_BASE_URL}/api/auth/sign-out`, {
    headers: buildAuthHeaders(),
    data: {},
    failOnStatusCode: false,
  });
};

export const signInWithEmailPassword = async (
  page: Page,
  input: {
    email: string;
    password: string;
    expectedRole?: string | null;
  },
): Promise<void> => {
  const response = await page.request.post(`${API_BASE_URL}/api/auth/sign-in/email`, {
    headers: buildAuthHeaders(),
    data: {
      email: input.email,
      password: input.password,
      rememberMe: true,
    },
  });

  if (!response.ok()) {
    const payload = await readJsonSafe(response);
    throw new Error(
      readErrorMessage(
        payload,
        `Email sign-in failed (${response.status()}): ${input.email}`,
      ),
    );
  }

  const session = await fetchSession(page.request);
  if (!session?.user) {
    throw new Error(`Session not established after sign-in: ${input.email}`);
  }

  if (session.user.email !== input.email) {
    throw new Error(
      `Signed-in session email mismatch. expected=${input.email} actual=${session.user.email ?? "null"}`,
    );
  }

  if (input.expectedRole !== undefined && session.user.role !== input.expectedRole) {
    throw new Error(
      `Signed-in session role mismatch. expected=${input.expectedRole ?? "null"} actual=${session.user.role ?? "null"}`,
    );
  }
};

export const provisionRoleUser = async (
  request: APIRequestContext,
  input: {
    prefix: string;
    role: E2ERole;
    generationId: string | null;
  },
): Promise<{
  id: string;
  email: string;
  password: string;
  name: string;
  requestedRole: E2ERole;
  assignedRole: AssignableRole;
}> => {
  const tempUser = await signUpTemporaryUser(input.prefix);
  const assignedRole = toAssignableRole(input.role);

  await adminApiRequest<{
    id: string;
    role: string | null;
    generationId: string | null;
  }>(request, {
    method: "PATCH",
    path: `/users/${tempUser.id}`,
    data: {
      role: assignedRole,
      generationId: input.generationId,
      familyName: "E2E",
      givenName: `${input.role}-user`,
      college: "공과대학",
      department: "컴퓨터과학과",
      studentNumber: `${Math.floor(1000000000 + Math.random() * 8999999999)}`,
      phoneNumber: "010-0000-0000",
    },
  });

  return {
    ...tempUser,
    requestedRole: input.role,
    assignedRole,
  };
};
