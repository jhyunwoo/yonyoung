import { describe, expect, it } from "vitest";
import { isAllowedMcpRedirectUri } from "../lib/auth/mcp-redirect";

describe("isAllowedMcpRedirectUri", () => {
  it("지원하는 클라이언트의 https 콜백을 허용한다", () => {
    for (const uri of [
      "https://claude.ai/api/mcp/auth_callback",
      "https://claude.com/api/mcp/auth_callback",
      "https://chatgpt.com/connector_platform_oauth_redirect",
      "https://chat.openai.com/aip/callback",
    ]) {
      expect(isAllowedMcpRedirectUri(uri)).toBe(true);
    }
  });

  it("사용자 자신의 기기로 돌아가는 루프백 콜백을 허용한다", () => {
    for (const uri of [
      "http://localhost:6274/oauth/callback",
      "http://127.0.0.1:33418/callback",
      "http://[::1]:8080/callback",
    ]) {
      expect(isAllowedMcpRedirectUri(uri)).toBe(true);
    }
  });

  it("그 밖의 주소는 거부한다", () => {
    for (const uri of [
      "https://evil.example/cb",
      "https://claude.ai.evil.example/cb",
      "https://evil.example/claude.ai",
      "https://claude.ai@evil.example/cb",
      "http://claude.ai/api/mcp/auth_callback",
      "http://localhost.evil.example/cb",
      "https://localhost.evil.example/cb",
      "x-evil://claude.ai/cb",
      "javascript:alert(1)",
      "not-a-url",
      "",
    ]) {
      expect(isAllowedMcpRedirectUri(uri)).toBe(false);
    }
  });
});
