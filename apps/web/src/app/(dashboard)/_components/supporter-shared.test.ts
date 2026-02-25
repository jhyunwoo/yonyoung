import { describe, expect, it } from "vitest";
import { AdminApiError, type ApiSupporter } from "../../../lib/admin-api/types";
import {
  formatTimestampToDateInput,
  parseDateInputToTimestamp,
  readSupporterErrorMessage,
  sortSupportersByExpiresAt,
} from "./supporter-shared";

const createSupporter = (
  id: string,
  expiresAt: number,
  name: string,
): ApiSupporter => ({
  id,
  name,
  link: "https://example.com",
  logoUrl: "https://example.com/logo.png",
  expiresAt,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  updatedBy: null,
});

describe("sortSupportersByExpiresAt", () => {
  it("만료일 오름차순으로 정렬한다", () => {
    const supporters = [
      createSupporter("late", 1_800_000_000_000, "Late"),
      createSupporter("early", 1_700_000_000_000, "Early"),
      createSupporter("middle", 1_750_000_000_000, "Middle"),
    ];

    const sorted = sortSupportersByExpiresAt(supporters);
    expect(sorted.map((supporter) => supporter.id)).toEqual([
      "early",
      "middle",
      "late",
    ]);
  });
});

describe("date input helpers", () => {
  it("timestamp를 yyyy-mm-dd 형식으로 변환한다", () => {
    expect(formatTimestampToDateInput(new Date(2026, 1, 25).getTime())).toBe(
      "2026-02-25",
    );
  });

  it("잘못된 timestamp는 빈 문자열로 변환한다", () => {
    expect(formatTimestampToDateInput(Number.NaN)).toBe("");
  });

  it("유효한 yyyy-mm-dd 값을 timestamp로 변환한다", () => {
    const parsed = parseDateInputToTimestamp("2026-02-25");
    expect(parsed).toBeTypeOf("number");
    expect(parsed).toBe(new Date(2026, 1, 25).getTime());
  });

  it("유효하지 않은 날짜 문자열은 null을 반환한다", () => {
    expect(parseDateInputToTimestamp("2026-02-31")).toBeNull();
    expect(parseDateInputToTimestamp("2026/02/25")).toBeNull();
    expect(parseDateInputToTimestamp("")).toBeNull();
  });
});

describe("readSupporterErrorMessage", () => {
  it("AdminApiError 메시지를 우선 사용한다", () => {
    const message = readSupporterErrorMessage(
      new AdminApiError({
        status: 400,
        code: "BAD_REQUEST",
        message: "검증 실패",
      }),
    );

    expect(message).toBe("검증 실패");
  });
});
