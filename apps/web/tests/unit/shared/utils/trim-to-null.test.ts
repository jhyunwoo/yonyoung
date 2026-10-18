import { describe, expect, it } from "vitest";

import { trimToNull } from "@/shared/utils/trim-to-null";

describe("trimToNull", () => {
  it("문자열의 앞뒤 공백을 지운다", () => {
    expect(trimToNull("  홍길동 ")).toBe("홍길동");
  });

  it("비었거나 공백뿐인 문자열은 null이다", () => {
    expect(trimToNull("")).toBeNull();
    expect(trimToNull("   ")).toBeNull();
  });

  it("문자열이 아니면 null이다", () => {
    expect(trimToNull(undefined)).toBeNull();
    expect(trimToNull(null)).toBeNull();
    expect(trimToNull(1)).toBeNull();
    expect(trimToNull({})).toBeNull();
  });
});
