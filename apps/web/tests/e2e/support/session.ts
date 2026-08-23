import type { BrowserContext } from "@playwright/test";
import type { MockRole } from "../mock-api/contracts";

const BASE_DOMAIN = "127.0.0.1";

type MockSessionOptions = {
  role: MockRole;
  profileMode?: "complete" | "incomplete";
  namespace?: string;
};

const createCookie = (input: { name: string; value: string; path?: string }) => ({
  name: input.name,
  value: input.value,
  domain: BASE_DOMAIN,
  path: input.path ?? "/",
  httpOnly: false,
  secure: false,
  sameSite: "Lax" as const,
});

export const clearMockSession = async (context: BrowserContext): Promise<void> => {
  await context.clearCookies();
};

export const setMockSession = async (
  context: BrowserContext,
  options: MockSessionOptions,
): Promise<void> => {
  await clearMockSession(context);
  const cookies = [
    createCookie({ name: "mock_role", value: options.role }),
    createCookie({ name: "mock_profile", value: options.profileMode ?? "complete" }),
    createCookie({ name: "mock_worker", value: options.namespace ?? "default" }),
  ];

  /*
    실제 브라우저라면 로그인한 사용자에게만 Better Auth 세션 쿠키가 있다.
    `proxy.ts` 의 게이트가 그 유무만 보므로, mock 세션도 같은 조건을 재현해야
    한다 — guest 는 "로그인하지 않은 상태"이므로 세션 쿠키를 주지 않는다.
    값은 아무 의미가 없다(게이트는 값을 검사하지 않고, 역할은 mock_role 이 정한다).
  */
  if (options.role !== "guest") {
    cookies.push(
      createCookie({
        name: "better-auth.session_token",
        value: `mock-session-${options.role}`,
      }),
    );
  }

  await context.addCookies(cookies);
};
