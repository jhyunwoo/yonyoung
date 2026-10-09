import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuthWithEnv } from "../../src/lib/auth";

const WEB_ORIGIN = "https://web.example.test";
const CLIENT_REDIRECT_URI = "https://claude.ai/api/mcp/auth_callback";
const db = env.db as D1Database;

// 플러그인 init이 oauth_resource를 읽으므로 마이그레이션 뒤에 만든다.
const createTestAuth = () =>
  createAuthWithEnv(db, {
    baseURL: WEB_ORIGIN,
    secret: "test-secret-that-is-at-least-32-characters-long",
    trustedOrigins: [WEB_ORIGIN],
    googleClientId: "google-id",
    googleClientSecret: "google-secret",
    emailAndPasswordEnabled: false,
    mcpResourceUrl: "https://api.example.test/mcp",
    mcpIssuer: `${WEB_ORIGIN}/api/auth`,
  });
let auth: ReturnType<typeof createTestAuth>;

const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// Google 제공자는 id_token을 서명 검증 없이 디코드해 사용자 정보를 읽는다.
const fakeGoogleIdToken = [
  base64Url({ alg: "RS256", typ: "JWT" }),
  base64Url({
    iss: "https://accounts.google.com",
    aud: "google-id",
    sub: "google-sub-1",
    email: "member@example.test",
    email_verified: true,
    name: "Member",
  }),
  "signature",
].join(".");

// 웹 BFF(/api/auth 프록시)는 sec-fetch-mode를 넘기지 않고 accept만 넘긴다.
const BROWSER_NAVIGATION_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const cookieJar = new Map<string, string>();
const storeCookies = (response: Response) => {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("=");
    cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
};
const cookieHeader = () =>
  [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");

beforeAll(async () => {
  await applyD1Migrations(db, env.TEST_MIGRATIONS as D1Migration[]);
  auth = createTestAuth();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MCP 인가 중 로그인", () => {
  it("로그인하지 않은 사용자가 Google 로그인을 마치면 동의 화면으로 간다", async () => {
    const registration = await auth.handler(
      new Request(`${WEB_ORIGIN}/api/auth/oauth2/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_name: "Claude",
          redirect_uris: [CLIENT_REDIRECT_URI],
          token_endpoint_auth_method: "none",
        }),
      }),
    );
    expect(registration.status).toBe(201);
    const { client_id: clientId } = (await registration.json()) as { client_id: string };

    const authorizeUrl = new URL(`${WEB_ORIGIN}/api/auth/oauth2/authorize`);
    authorizeUrl.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: CLIENT_REDIRECT_URI,
      scope: "openid mcp",
      state: "client-state",
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
      resource: "https://api.example.test/mcp",
    }).toString();
    const authorize = await auth.handler(
      new Request(authorizeUrl, { headers: BROWSER_NAVIGATION_HEADERS }),
    );
    expect(authorize.status).toBe(302);
    const signInUrl = new URL(authorize.headers.get("location")!, WEB_ORIGIN);
    expect(signInUrl.pathname).toBe("/auth/sign-in");
    expect(signInUrl.searchParams.get("sig")).toBeTruthy();

    // 로그인 화면은 oauthProviderClient가 붙이는 oauth_query와 함께, 쿼리 없는 콜백 URL로 로그인한다.
    const socialSignIn = await auth.handler(
      new Request(`${WEB_ORIGIN}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: WEB_ORIGIN },
        body: JSON.stringify({
          provider: "google",
          callbackURL: `${WEB_ORIGIN}/auth/sign-in`,
          disableRedirect: true,
          oauth_query: signInUrl.search.slice(1),
        }),
      }),
    );
    expect(socialSignIn.status).toBe(200);
    storeCookies(socialSignIn);
    const { url: googleUrl } = (await socialSignIn.json()) as { url: string };
    const state = new URL(googleUrl).searchParams.get("state")!;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.startsWith("https://oauth2.googleapis.com/token")) {
        return Response.json({
          access_token: "google-access-token",
          id_token: fakeGoogleIdToken,
          expires_in: 3600,
          token_type: "Bearer",
          scope: "openid email profile",
        });
      }
      throw new Error(`예상하지 못한 외부 요청: ${url}`);
    });

    const callback = await auth.handler(
      new Request(
        `${WEB_ORIGIN}/api/auth/callback/google?code=google-code&state=${encodeURIComponent(state)}`,
        { headers: { ...BROWSER_NAVIGATION_HEADERS, cookie: cookieHeader() } },
      ),
    );

    expect(callback.status).toBe(302);
    const next = new URL(callback.headers.get("location")!, WEB_ORIGIN);
    expect(next.pathname).toBe("/auth/mcp-consent");
    expect(next.searchParams.get("client_id")).toBe(clientId);
  });
});
