import { describe, expect, it } from "vitest";
import { AdminApiError } from "../../../lib/admin-api/types";
import {
  findLinktreeItemById,
  normalizeLinktreeItemInput,
  normalizeLinktreeName,
  readLinktreeErrorMessage,
  sortLinktreesByName,
} from "./linktree-shared";

describe("linktree-shared helpers", () => {
  const BASE_TS = 1_700_000_000_000;

  it("readLinktreeErrorMessage는 AdminApiError 메시지를 우선 사용한다", () => {
    const message = readLinktreeErrorMessage(
      new AdminApiError({
        status: 400,
        code: "BAD_REQUEST",
        message: "검증 실패",
      }),
    );

    expect(message).toBe("검증 실패");
  });

  it("sortLinktreesByName은 이름 기준으로 정렬한다", () => {
    const sorted = sortLinktreesByName([
      { id: "b", name: "부서", createdAt: BASE_TS, updatedAt: BASE_TS, updatedBy: null, items: [] },
      { id: "a", name: "공지", createdAt: BASE_TS, updatedAt: BASE_TS, updatedBy: null, items: [] },
      { id: "c", name: "행사", createdAt: BASE_TS, updatedAt: BASE_TS, updatedBy: null, items: [] },
    ]);

    expect(sorted.map((row) => row.name)).toEqual(["공지", "부서", "행사"]);
  });

  it("findLinktreeItemById는 itemId에 맞는 링크를 찾는다", () => {
    const found = findLinktreeItemById(
      {
        id: "group-id",
        name: "SNS",
        createdAt: BASE_TS,
        updatedAt: BASE_TS,
        updatedBy: null,
        items: [
          {
            id: "item-1",
            linktreeId: "group-id",
            name: "인스타",
            link: "https://example.com/1",
            createdAt: BASE_TS,
            updatedAt: BASE_TS,
            updatedBy: null,
          },
          {
            id: "item-2",
            linktreeId: "group-id",
            name: "유튜브",
            link: "https://example.com/2",
            createdAt: BASE_TS,
            updatedAt: BASE_TS,
            updatedBy: null,
          },
        ],
      },
      "item-2",
    );

    expect(found?.name).toBe("유튜브");
  });

  it("normalizeLinktreeName/normalizeLinktreeItemInput은 앞뒤 공백을 제거한다", () => {
    expect(normalizeLinktreeName("  공지 링크  ")).toBe("공지 링크");
    expect(
      normalizeLinktreeItemInput({
        name: "  인스타  ",
        link: "  https://example.com/insta  ",
      }),
    ).toEqual({
      name: "인스타",
      link: "https://example.com/insta",
    });
  });
});
