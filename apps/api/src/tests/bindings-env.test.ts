import { describe, expect, it } from "vitest";
import { parseBooleanEnv, parseEnv, parseNumberEnv } from "../bindings/env";

describe("runtime binding env", () => {
  it("이전 공개 URL 서명 시크릿 binding을 보존한다", () => {
    const parsed = parseEnv({
      R2_PUBLIC_URL_SIGNING_SECRET:
        "current-public-url-signing-secret-at-least-32-chars",
      R2_PUBLIC_URL_SIGNING_SECRET_PREVIOUS:
        "previous-public-url-signing-secret-at-least-32-chars",
    } as never);

    expect(parsed.R2_PUBLIC_URL_SIGNING_SECRET).toContain("current-public");
    expect(parsed.R2_PUBLIC_URL_SIGNING_SECRET_PREVIOUS).toContain(
      "previous-public",
    );
  });

  it("32자 미만 공개 URL 서명 시크릿을 거부한다", () => {
    expect(() =>
      parseEnv({ R2_PUBLIC_URL_SIGNING_SECRET: "too-short" } as never),
    ).toThrow();
  });

  it("boolean binding 표기와 알 수 없는 값의 fallback을 정규화한다", () => {
    expect(parseBooleanEnv(" OFF ", true)).toBe(false);
    expect(parseBooleanEnv("unexpected", true)).toBe(true);
  });

  it("숫자 binding의 누락과 잘못된 값을 fallback으로 처리한다", () => {
    expect(parseNumberEnv(undefined, 25)).toBe(25);
    expect(parseNumberEnv("not-a-number", 25)).toBe(25);
    expect(parseNumberEnv(" 500 ", 25)).toBe(500);
  });
});
