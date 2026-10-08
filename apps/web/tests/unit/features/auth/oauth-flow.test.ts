import { describe, expect, it } from "vitest";
import { isOAuthAuthorizationRequest } from "@/features/auth/model/oauth-flow";
import { isServerToServerOAuthPath } from "@/server/security/oauth-proxy-paths";

describe("isOAuthAuthorizationRequest", () => {
  it("Better Auth가 서명한 인가 요청 쿼리를 알아본다", () => {
    expect(isOAuthAuthorizationRequest({ client_id: "c1", sig: "s", exp: "1" })).toBe(true);
  });

  it("일반 로그인 쿼리는 아니다", () => {
    expect(isOAuthAuthorizationRequest({})).toBe(false);
    expect(isOAuthAuthorizationRequest({ client_id: "c1" })).toBe(false);
    expect(isOAuthAuthorizationRequest({ sig: ["a", "b"], client_id: "c1" })).toBe(false);
  });
});

describe("isServerToServerOAuthPath", () => {
  it.each([
    ["oauth2/token", true],
    ["oauth2/register", true],
    ["oauth2/revoke", true],
    ["oauth2/consent", false],
    ["sign-in/social", false],
  ])("%s → %s", (path, expected) => {
    expect(isServerToServerOAuthPath(path)).toBe(expected);
  });
});
