import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import type { FullConfig } from "@playwright/test";
import { request, type APIRequestContext } from "@playwright/test";
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

const isNotFoundApiResponse = (status: number, body: string): boolean => {
  if (status !== 404) {
    return false;
  }

  return body.includes("\"code\":\"NOT_FOUND\"") || body.includes("대상을 찾을 수 없습니다.");
};

const runCommand = async (
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> => {
  return await new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        cwd,
        timeout: 20_000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              [
                `command failed: ${cmd} ${args.join(" ")}`,
                stderr?.trim() || error.message,
              ].join("\n"),
            ),
          );
          return;
        }

        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
        });
      },
    );
  });
};

const escapeSqlLiteral = (value: string): string => value.replace(/'/g, "''");

const runD1Mutation = async (sql: string): Promise<boolean> => {
  const dbName = process.env.E2E_D1_DATABASE_NAME?.trim() || "yonyoung-db";
  const allowRemoteFallback =
    process.env.E2E_D1_ALLOW_REMOTE_FALLBACK?.trim().toLowerCase() === "true";
  const apiDir = path.resolve(__dirname, "..", "..", "..", "api");
  const locations: Array<"local" | "remote"> = allowRemoteFallback
    ? ["local", "remote"]
    : ["local"];
  for (const location of locations) {
    try {
      await runCommand(
        "pnpm",
        [
          "exec",
          "wrangler",
          "d1",
          "execute",
          dbName,
          location === "remote" ? "--remote" : "--local",
          "--command",
          sql,
        ],
        apiDir,
      );
      return true;
    } catch {
      // 다음 위치(local/remote)로 fallback 한다.
    }
  }

  return false;
};

const recoverSoftDeletedAdminUser = async (userId: string): Promise<boolean> => {
  const escapedUserId = escapeSqlLiteral(userId);
  const sql = [
    "UPDATE \"user\"",
    "SET \"deleted_at\" = NULL,",
    "    \"updated_at\" = cast(unixepoch('subsecond') * 1000 as integer)",
    `WHERE \"id\" = '${escapedUserId}'`,
    "  AND \"deleted_at\" IS NOT NULL;",
  ].join(" ");

  return runD1Mutation(sql);
};

const promoteAdminRole = async (userId: string): Promise<boolean> => {
  const escapedUserId = escapeSqlLiteral(userId);
  const sql = [
    "UPDATE \"user\"",
    "SET \"role\" = 'president',",
    "    \"email_verified\" = 1,",
    "    \"deleted_at\" = NULL,",
    "    \"updated_at\" = cast(unixepoch('subsecond') * 1000 as integer)",
    `WHERE \"id\" = '${escapedUserId}';`,
  ].join(" ");

  return runD1Mutation(sql);
};

const bootstrapAdminAccountIfMissing = async (
  apiContext: APIRequestContext,
  apiUrl: string,
  adminEmail: string,
  adminPassword: string,
): Promise<void> => {
  const signUpResponse = await apiContext
    .post("/api/auth/sign-up/email", {
      data: {
        name: "E2E Admin",
        email: adminEmail,
        password: adminPassword,
      },
    })
    .catch((error: unknown) => {
      if (isTimeoutError(error)) {
        throw new Error(buildApiTimeoutMessage(apiUrl, "/api/auth/sign-up/email"));
      }
      throw error;
    });

  if (signUpResponse.ok()) {
    return;
  }

  const body = await signUpResponse.text();
  if (
    body.includes("USER_ALREADY_EXISTS") ||
    body.includes("user already exists")
  ) {
    return;
  }

  throw new Error(
    `E2E admin bootstrap sign-up failed (${signUpResponse.status()}): ${body.slice(0, 300)}`,
  );
};

export default async function globalSetup(_config: FullConfig) {
  loadE2eEnv();
  const apiUrl = readE2eEnv("E2E_API_URL", "http://localhost:8787");
  const webOrigin = resolveWebOrigin();
  const required = requireE2eEnv(["E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"]);
  const adminEmail = required.E2E_ADMIN_EMAIL;
  const adminPassword = required.E2E_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD 환경변수가 필요합니다.");
  }

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

    const signInAdmin = async () => {
      return apiContext
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
    };

    let signInResponse = await signInAdmin();
    let signInBody = signInResponse.ok() ? "" : await signInResponse.text();

    if (
      !signInResponse.ok() &&
      signInBody.includes("INVALID_EMAIL_OR_PASSWORD")
    ) {
      await bootstrapAdminAccountIfMissing(
        apiContext,
        apiUrl,
        adminEmail,
        adminPassword,
      );
      signInResponse = await signInAdmin();
      signInBody = signInResponse.ok() ? "" : await signInResponse.text();
    }

    if (!signInResponse.ok()) {
      const body = signInBody;
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

    let sessionPayload = (await sessionResponse.json().catch(() => null)) as
      | {
          user?: {
            id?: string;
            role?: string | null;
          };
        }
      | null;

    let userId = sessionPayload?.user?.id;
    let role = sessionPayload?.user?.role;
    if (userId && role !== "president") {
      const promoted = await promoteAdminRole(userId);
      if (promoted) {
        const refreshedSession = await apiContext.get("/api/auth/get-session");
        if (refreshedSession.ok()) {
          sessionPayload = (await refreshedSession.json().catch(() => null)) as
            | {
                user?: {
                  id?: string;
                  role?: string | null;
                };
              }
            | null;
          userId = sessionPayload?.user?.id;
          role = sessionPayload?.user?.role;
        }
      }
    }

    if (role !== "president") {
      throw new Error(
        `E2E admin account role must be 'president'. current=${role ?? "null"}`,
      );
    }

    if (userId) {
      try {
        const adminProfilePatch = {
          familyName: "E2E",
          givenName: "Admin",
          college: "공과대학",
          department: "컴퓨터과학과",
          studentNumber: "2026000001",
          phoneNumber: "010-0000-0000",
        };

        let profileResponse = await apiContext.patch(`/api/users/${userId}`, {
          data: {
            ...adminProfilePatch,
          },
        });

        if (!profileResponse.ok()) {
          let body = await profileResponse.text();
          if (isNotFoundApiResponse(profileResponse.status(), body)) {
            const recovered = await recoverSoftDeletedAdminUser(userId);
            if (recovered) {
              profileResponse = await apiContext.patch(`/api/users/${userId}`, {
                data: {
                  ...adminProfilePatch,
                },
              });

              if (!profileResponse.ok()) {
                body = await profileResponse.text();
              } else {
                body = "";
              }
            }

            if (!recovered || !profileResponse.ok()) {
              console.warn(
                [
                  `Failed to restore E2E admin /api/users record for ${userId}.`,
                  `Recovery attempted: ${recovered ? "yes" : "no"}`,
                  `PATCH status: ${profileResponse.status()}`,
                  `PATCH response: ${body.slice(0, 300)}`,
                  "확인할 내용:",
                  "1) wrangler remote/local D1 접근 권한",
                  "2) E2E_ADMIN_EMAIL 계정이 Better Auth에 유효한지",
                ].join("\n"),
              );
            }
          } else {
            console.warn(
              `Failed to update E2E admin profile (${profileResponse.status()}): ${body.slice(0, 300)}`,
            );
          }
        }
      } catch (error) {
        if (!isTimeoutError(error)) {
          throw error;
        }

        console.warn(
          "E2E admin profile update timed out; continuing with existing profile data.",
        );
      }
    }

    await apiContext.storageState({ path: storagePath });
  } finally {
    await apiContext.dispose();
  }
}
