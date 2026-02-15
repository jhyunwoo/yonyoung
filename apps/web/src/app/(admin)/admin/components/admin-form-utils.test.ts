import { describe, expect, it } from "vitest";
import { AdminApiError } from "../../../../lib/admin-api/types";
import {
  ADMIN_USER_ROLE_OPTIONS,
  formatTimestamp,
  readErrorMessage,
  toDateInputValue,
  toPositiveInteger,
  toTimestampMs,
} from "./admin-form-utils";

describe("admin-form-utils", () => {
  it("formatTimestamp는 유효한 timestamp를 로케일 문자열로 변환한다", () => {
    const timestamp = Date.parse("2024-01-01T00:00:00.000Z");
    const value = formatTimestamp(timestamp);
    expect(value).not.toBe("-");
    expect(value).toContain("2024");
  });

  it("formatTimestamp는 유효하지 않은 값에서 '-'를 반환한다", () => {
    const value = formatTimestamp(Number.NaN);
    expect(value).toBe("-");
  });

  it("toDateInputValue는 timestamp를 yyyy-mm-dd로 변환한다", () => {
    const timestamp = Date.parse("2024-03-15T00:00:00.000Z");
    expect(toDateInputValue(timestamp)).toBe("2024-03-15");
  });

  it("toDateInputValue는 null/undefined/invalid에 빈 문자열을 반환한다", () => {
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue(undefined)).toBe("");
    expect(toDateInputValue(Number.NaN)).toBe("");
  });

  it("toTimestampMs는 날짜 입력 문자열을 UTC 00:00:00 timestamp로 변환한다", () => {
    const result = toTimestampMs("2024-03-15");
    expect(result).toBe(Date.parse("2024-03-15T00:00:00.000Z"));
  });

  it("toTimestampMs는 유효하지 않은 날짜 입력에서 오류를 던진다", () => {
    expect(() => toTimestampMs("not-a-date")).toThrow("유효한 날짜를 입력해 주세요.");
  });

  it("toPositiveInteger는 0 이상의 정수 문자열을 숫자로 변환한다", () => {
    expect(toPositiveInteger("0", "정렬 순서")).toBe(0);
    expect(toPositiveInteger("10", "정렬 순서")).toBe(10);
  });

  it("toPositiveInteger는 음수/소수/문자열에서 오류를 던진다", () => {
    expect(() => toPositiveInteger("-1", "정렬 순서")).toThrow(
      "정렬 순서는 0 이상의 정수여야 합니다.",
    );
    expect(() => toPositiveInteger("1.5", "정렬 순서")).toThrow(
      "정렬 순서는 0 이상의 정수여야 합니다.",
    );
    expect(() => toPositiveInteger("abc", "정렬 순서")).toThrow(
      "정렬 순서는 0 이상의 정수여야 합니다.",
    );
  });

  it("readErrorMessage는 AdminApiError의 메시지를 우선 반환한다", () => {
    const error = new AdminApiError({ status: 400, code: "BAD_REQUEST", message: "입력 오류" });
    expect(readErrorMessage(error)).toBe("입력 오류");
  });

  it("readErrorMessage는 일반 객체의 message를 읽고, 없으면 기본 메시지를 반환한다", () => {
    expect(readErrorMessage({ message: "일반 오류" })).toBe("일반 오류");
    expect(readErrorMessage({})).toBe("요청 처리 중 오류가 발생했습니다.");
    expect(readErrorMessage(null)).toBe("요청 처리 중 오류가 발생했습니다.");
  });

  it("ADMIN_USER_ROLE_OPTIONS는 기대한 관리자 역할 옵션 목록을 포함한다", () => {
    expect(ADMIN_USER_ROLE_OPTIONS).toEqual([
      "president",
      "vice_president",
      "manager",
      "new_member",
      "associate_member",
      "regular_member",
      "unverified",
    ]);
  });
});
