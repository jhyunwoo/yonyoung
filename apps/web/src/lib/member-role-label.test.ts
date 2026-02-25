import { describe, expect, it } from "vitest";
import {
  buildMemberRoleLabel,
  canEditMemberProfile,
  isExecutiveRole,
} from "./member-role-label";

describe("buildMemberRoleLabel", () => {
  it("회원 역할을 요청된 용어로 매핑한다", () => {
    expect(buildMemberRoleLabel("new_member")).toBe("신입회원");
    expect(buildMemberRoleLabel("associate_member")).toBe("준회원");
    expect(buildMemberRoleLabel("regular_member")).toBe("정회원");
  });

  it("운영진 역할도 올바르게 라벨링한다", () => {
    expect(buildMemberRoleLabel("president")).toBe("회장");
    expect(buildMemberRoleLabel("vice_president")).toBe("부회장");
    expect(buildMemberRoleLabel("manager")).toBe("부장");
  });
});

describe("role predicates", () => {
  it("운영진 여부를 판별한다", () => {
    expect(isExecutiveRole("president")).toBe(true);
    expect(isExecutiveRole("vice_president")).toBe(true);
    expect(isExecutiveRole("manager")).toBe(true);
    expect(isExecutiveRole("regular_member")).toBe(false);
  });

  it("수정 가능 역할을 회장/부회장으로 제한한다", () => {
    expect(canEditMemberProfile("president")).toBe(true);
    expect(canEditMemberProfile("vice_president")).toBe(true);
    expect(canEditMemberProfile("manager")).toBe(false);
  });
});
