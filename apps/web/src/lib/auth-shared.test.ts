import { describe, expect, it } from "vitest";
import {
  canAccessAdminPage,
  canManageGenerations,
  getRoleFromSession,
  isAdminRole,
  isAdminSession,
  isPresidentRole,
  isUnverifiedRole,
} from "./auth-shared";

describe("auth-shared helpers", () => {
  it("getRoleFromSession은 유효한 role 문자열을 반환한다", () => {
    expect(getRoleFromSession({ user: { role: "manager" } })).toBe("manager");
  });

  it("getRoleFromSession은 role이 없거나 비문자열이면 null을 반환한다", () => {
    expect(getRoleFromSession(null)).toBeNull();
    expect(getRoleFromSession({ user: { role: 123 } })).toBeNull();
    expect(getRoleFromSession({ user: { role: "" } })).toBeNull();
  });

  it("isAdminRole은 president/vice_president/manager만 true", () => {
    expect(isAdminRole("president")).toBe(true);
    expect(isAdminRole("vice_president")).toBe(true);
    expect(isAdminRole("manager")).toBe(true);
    expect(isAdminRole("regular_member")).toBe(false);
    expect(isAdminRole("unverified")).toBe(false);
  });

  it("isAdminSession은 관리자 role 세션에서 true", () => {
    expect(isAdminSession({ user: { role: "president" } })).toBe(true);
    expect(isAdminSession({ user: { role: "regular_member" } })).toBe(false);
    expect(isAdminSession(null)).toBe(false);
  });

  it("isUnverifiedRole은 대소문자 무시로 unverified를 판별한다", () => {
    expect(isUnverifiedRole("unverified")).toBe(true);
    expect(isUnverifiedRole("UNVERIFIED")).toBe(true);
    expect(isUnverifiedRole("regular_member")).toBe(false);
  });

  it("isPresidentRole은 president 문자열만 true", () => {
    expect(isPresidentRole("president")).toBe(true);
    expect(isPresidentRole("vice_president")).toBe(false);
  });

  it("canAccessAdminPage는 unverified를 제외한 로그인 세션에서 true", () => {
    expect(canAccessAdminPage(null)).toBe(false);
    expect(canAccessAdminPage({ user: { role: "unverified" } })).toBe(false);
    expect(canAccessAdminPage({ user: { role: "regular_member" } })).toBe(true);
  });

  it("canManageGenerations는 president 세션에서만 true", () => {
    expect(canManageGenerations({ user: { role: "president" } })).toBe(true);
    expect(canManageGenerations({ user: { role: "vice_president" } })).toBe(false);
    expect(canManageGenerations({ user: { role: "manager" } })).toBe(false);
  });
});
