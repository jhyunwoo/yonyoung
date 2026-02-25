import { describe, expect, it } from "vitest";
import { shouldUseUnoptimizedImage } from "./image-utils";

describe("image-utils", () => {
  it("빈 값은 false를 반환한다", () => {
    expect(shouldUseUnoptimizedImage("")).toBe(false);
  });

  it("http/https URL은 true를 반환한다", () => {
    expect(shouldUseUnoptimizedImage("https://example.com/a.png")).toBe(true);
    expect(shouldUseUnoptimizedImage("http://example.com/a.png")).toBe(true);
  });

  it("비 URL 문자열은 false를 반환한다", () => {
    expect(shouldUseUnoptimizedImage("not-a-url")).toBe(false);
  });
});
