import { describe, expect, it } from "vitest";
import { can, normalizeRole } from "../lib/authorization/policy";

describe("authorization policy", () => {
  it("제거된 user role 문자열은 unverified로 정규화한다", () => {
    expect(normalizeRole("user")).toBe("unverified");
  });

  it("알 수 없는 role은 unverified로 정규화한다", () => {
    expect(normalizeRole("something-else")).toBe("unverified");
    expect(normalizeRole(null)).toBe("unverified");
  });

  it("회장은 모든 권한을 가진다", () => {
    expect(can("president", "generation", "delete")).toBe(true);
    expect(can("president", "user", "update")).toBe(true);
  });

  it("부회장은 generation delete만 불가하다", () => {
    expect(can("vice_president", "generation", "delete")).toBe(false);
    expect(can("vice_president", "generation", "update")).toBe(true);
  });

  it("부장은 exhibition delete는 불가하고 activity delete는 가능하다", () => {
    expect(can("manager", "exhibition", "delete")).toBe(false);
    expect(can("manager", "activity", "delete")).toBe(true);
  });

  it("부원은 user 일반 조회 권한이 없다", () => {
    expect(can("member", "user", "read")).toBe(false);
  });

  it("신규 member 계열 role은 기존 member와 동일 권한을 가진다", () => {
    expect(can("new_member", "activity", "read")).toBe(true);
    expect(can("associate_member", "supporter", "update")).toBe(false);
    expect(can("regular_member", "user", "read")).toBe(false);
  });

  it("unverified는 어떤 리소스 권한도 없다", () => {
    expect(can("unverified", "generation", "read")).toBe(false);
    expect(can("unverified", "user", "update")).toBe(false);
  });
});
