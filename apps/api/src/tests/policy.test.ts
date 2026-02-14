import { describe, expect, it } from "vitest";
import { can, normalizeRole } from "../lib/authorization/policy";

describe("authorization policy", () => {
  it("legacy user role을 member로 정규화한다", () => {
    expect(normalizeRole("user")).toBe("member");
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
});
