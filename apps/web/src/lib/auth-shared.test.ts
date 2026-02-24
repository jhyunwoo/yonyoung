import { describe, expect, it } from "vitest";
import {
  formatKoreanMobilePhoneNumber,
  isKoreanMobilePhoneNumber,
} from "@repo/shared-auth/profile";
import {
  getRoleFromSession,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
} from "./auth-shared";

describe("auth-shared helpers", /** describe 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
  it("getRoleFromSession은 유효한 role 문자열을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(getRoleFromSession({ user: { role: "manager" } })).toBe("manager");
  });

  it("getRoleFromSession은 role이 없거나 비문자열이면 null을 반환한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(getRoleFromSession(null)).toBeNull();
    expect(getRoleFromSession({ user: { role: 123 } })).toBeNull();
    expect(getRoleFromSession({ user: { role: "" } })).toBeNull();
  });

  it("isUnverifiedRole은 대소문자 무시로 unverified를 판별한다", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(isUnverifiedRole("unverified")).toBe(true);
    expect(isUnverifiedRole("UNVERIFIED")).toBe(true);
    expect(isUnverifiedRole("regular_member")).toBe(false);
  });

  it("hasCompletedRequiredProfile은 필수 필드가 모두 채워졌을 때 true", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(
      hasCompletedRequiredProfile({
        familyName: "김",
        givenName: "민수",
        college: "공과대학",
        department: "컴퓨터과학과",
        studentNumber: "2026000123",
        phoneNumber: "010-1234-5678",
      }),
    ).toBe(true);
  });

  it("hasCompletedRequiredProfile은 하나라도 비어 있으면 false", /** it 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    expect(
      hasCompletedRequiredProfile({
        familyName: "김",
        givenName: "민수",
        college: "공과대학",
        department: "",
        studentNumber: "2026000123",
        phoneNumber: "010-1234-5678",
      }),
    ).toBe(false);
  });

  it("formatKoreanMobilePhoneNumber는 숫자 입력을 010-1234-5678 형태로 변환한다", () => {
    expect(formatKoreanMobilePhoneNumber("01092602402")).toBe("010-9260-2402");
    expect(formatKoreanMobilePhoneNumber("010-9260-2402")).toBe("010-9260-2402");
  });

  it("isKoreanMobilePhoneNumber는 010-1234-5678 형식만 허용한다", () => {
    expect(isKoreanMobilePhoneNumber("010-9260-2402")).toBe(true);
    expect(isKoreanMobilePhoneNumber("01092602402")).toBe(false);
    expect(isKoreanMobilePhoneNumber("011-9260-2402")).toBe(false);
  });
});
