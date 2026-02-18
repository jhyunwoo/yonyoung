import fs from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { request } from "@playwright/test";
import { loadE2eEnv, readE2eEnv, requireE2eEnv } from "./env";

const storagePath = path.resolve(__dirname, ".auth", "admin.json");
const API_REQUEST_TIMEOUT_MS = 8_000;

const resolveWebOrigin = (): string => {
  const fallback = "http://localhost:3000";
  const baseUrl = process.env.E2E_BASE_URL ?? fallback;

  try {
    return new URL(baseUrl).origin;
  } catch {
    return fallback;
  }
};

const isTimeoutError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "TimeoutError" ||
    error.message.includes("Timeout") ||
    error.message.includes("timed out")
  );
};

const buildApiTimeoutMessage = (apiUrl: string, endpoint: string): string => {
  return [
    `E2E API 요청이 시간 내에 응답하지 않았습니다: ${endpoint}`,
    `API URL: ${apiUrl}`,
    "",
    "확인할 내용:",
    "1) apps/api 서버 로그에서 Wrangler 오류를 확인하세요.",
    "2) 특히 'Failed to start the remote proxy session' 메시지가 있는지 확인하세요.",
    "3) API 서버를 재시작한 뒤 다시 실행하세요.",
    "",
    "예시:",
    "pnpm --filter api dev",
  ].join("\n");
};

export default async function globalSetup(_config: FullConfig) {
  loadE2eEnv();
  const apiUrl = readE2eEnv("E2E_API_URL", "http://localhost:8787");
  const webOrigin = resolveWebOrigin();
  const required = requireE2eEnv(["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"]);
  const adminEmail = required.E2E_ADMIN_EMAIL;
  const adminPassword = required.E2E_ADMIN_PASSWORD;

  await fs.mkdir(path.dirname(storagePath), { recursive: true });

  const apiContext = await request.newContext({
    baseURL: apiUrl,
    timeout: API_REQUEST_TIMEOUT_MS,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: webOrigin,
      Referer: `${webOrigin}/`,
    },
  });

  try {
    try {
      const healthResponse = await apiContext.get("/message");
      if (!healthResponse.ok()) {
        const body = await healthResponse.text();
        throw new Error(
          [
            `E2E API health check failed (${healthResponse.status()})`,
            `API URL: ${apiUrl}`,
            `response: ${body.slice(0, 300)}`,
          ].join("\n"),
        );
      }
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new Error(buildApiTimeoutMessage(apiUrl, "/message"));
      }
      throw error;
    }

    const signInResponse = await apiContext
      .post("/api/auth/sign-in/email", {
        data: {
          email: adminEmail,
          password: adminPassword,
          rememberMe: true,
        },
      })
      .catch((error: unknown) => {
        if (isTimeoutError(error)) {
          throw new Error(buildApiTimeoutMessage(apiUrl, "/api/auth/sign-in/email"));
        }
        throw error;
      });

    if (!signInResponse.ok()) {
      const body = await signInResponse.text();
      if (body.includes("EMAIL_AND_PASSWORD_IS_NOT_ENABLED")) {
        throw new Error(
          [
            "E2E admin sign-in failed: email/password login is disabled on API.",
            "Set `BETTER_AUTH_EMAIL_AND_PASSWORD_ENABLED=true` in apps/api/.dev.vars and restart the API server.",
            `API response (${signInResponse.status()}): ${body.slice(0, 300)}`,
          ].join("\n"),
        );
      }

      // sign-in이 일시적으로 실패하면 기존 인증 상태를 재사용해 본다.
      const cachedContext = await request.newContext({
        baseURL: apiUrl,
        timeout: API_REQUEST_TIMEOUT_MS,
        storageState: storagePath,
        extraHTTPHeaders: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Origin: webOrigin,
          Referer: `${webOrigin}/`,
        },
      });

      try {
        const cachedSession = await cachedContext.get("/api/auth/get-session");
        if (cachedSession.ok()) {
          const cachedPayload = (await cachedSession.json().catch(() => null)) as
            | {
                user?: {
                  role?: string | null;
                };
              }
            | null;

          if (cachedPayload?.user?.role === "president") {
            return;
          }
        }
      } finally {
        await cachedContext.dispose();
      }

      throw new Error(
        `E2E admin sign-in failed (${signInResponse.status()}): ${body.slice(0, 300)}`,
      );
    }

    const sessionResponse = await apiContext.get("/api/auth/get-session");
    if (!sessionResponse.ok()) {
      const body = await sessionResponse.text();
      throw new Error(
        `Failed to verify admin session (${sessionResponse.status()}): ${body.slice(0, 300)}`,
      );
    }

    const sessionPayload = (await sessionResponse.json().catch(() => null)) as
      | {
          user?: {
            id?: string;
            role?: string | null;
          };
        }
      | null;

    const userId = sessionPayload?.user?.id;
    const role = sessionPayload?.user?.role;
    if (role !== "president") {
      throw new Error(
        `E2E admin account role must be 'president'. current=${role ?? "null"}`,
      );
    }

    if (userId) {
      const profileResponse = await apiContext.patch(`/api/users/${userId}`, {
        data: {
          familyName: "E2E",
          givenName: "Admin",
          college: "공과대학",
          department: "컴퓨터과학과",
          studentNumber: "2026000001",
          phoneNumber: "010-0000-0000",
        },
      });

      if (!profileResponse.ok()) {
        const body = await profileResponse.text();
        throw new Error(
          `Failed to update E2E admin profile (${profileResponse.status()}): ${body.slice(0, 300)}`,
        );
      }
    }

    await apiContext.storageState({ path: storagePath });
  } finally {
    await apiContext.dispose();
  }
}
