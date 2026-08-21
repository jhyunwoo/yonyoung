import { describe, expect, it } from "vitest";
import {
  addVisibleUserIds,
  hasActiveMemberFilters,
  mergeUpdatedUsers,
  summarizeMemberSelection,
  toggleSelectedUserId,
} from "@/features/dashboard/members/member-selection";

describe("member selection", () => {
  it("선택되지 않은 멤버를 토글하면 추가한다", () => {
    expect(toggleSelectedUserId(["a"], "b")).toEqual(["a", "b"]);
  });

  it("이미 선택된 멤버를 토글하면 제거한다", () => {
    expect(toggleSelectedUserId(["a", "b"], "a")).toEqual(["b"]);
  });

  it("현재 목록 전체 선택은 기존 선택을 유지하고 중복을 만들지 않는다", () => {
    expect(addVisibleUserIds(["a", "z"], ["a", "b", "c"])).toEqual([
      "a",
      "z",
      "b",
      "c",
    ]);
  });

  it("필터에 가려진 선택도 개수로 구분해 보고한다", () => {
    expect(summarizeMemberSelection(["a", "b", "c"], ["a", "d"])).toEqual({
      totalSelectedCount: 3,
      visibleSelectedCount: 1,
      hiddenSelectedCount: 2,
    });
  });

  it("선택이 없으면 모든 개수가 0이다", () => {
    expect(summarizeMemberSelection([], ["a", "b"])).toEqual({
      totalSelectedCount: 0,
      visibleSelectedCount: 0,
      hiddenSelectedCount: 0,
    });
  });

  it("일괄 변경 응답은 기존 목록의 순서를 유지한 채 병합한다", () => {
    const users = [{ id: "a", role: "member" }, { id: "b", role: "member" }];
    const updated = [{ id: "b", role: "manager" }];

    expect(mergeUpdatedUsers(users, updated)).toEqual([
      { id: "a", role: "member" },
      { id: "b", role: "manager" },
    ]);
  });

  it("응답에 없는 사용자는 그대로 둔다", () => {
    const users = [{ id: "a", role: "member" }];
    expect(mergeUpdatedUsers(users, [{ id: "zzz", role: "manager" }])).toEqual(
      users,
    );
  });

  it("공백만 있는 검색어는 활성 필터로 보지 않는다", () => {
    expect(
      hasActiveMemberFilters({
        query: "   ",
        college: "",
        department: "",
        generationId: "",
      }),
    ).toBe(false);
  });

  it("필터가 하나라도 걸려 있으면 활성으로 본다", () => {
    expect(
      hasActiveMemberFilters({
        query: "",
        college: "",
        department: "",
        generationId: "gen-1",
      }),
    ).toBe(true);
  });
});
