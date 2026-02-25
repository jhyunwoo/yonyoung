import { describe, expect, it } from "vitest";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "./member-display-name";

describe("buildMemberDisplayName", () => {
  it("성/이름이 있으면 한글 이름을 우선 사용한다", () => {
    expect(
      buildMemberDisplayName({
        familyName: "김",
        givenName: "연영",
        name: "legacy",
        email: "legacy@example.com",
      }),
    ).toBe("김연영");
  });

  it("성/이름이 없으면 레거시 name을 사용한다", () => {
    expect(
      buildMemberDisplayName({
        familyName: null,
        givenName: null,
        name: "legacy",
      }),
    ).toBe("legacy");
  });

  it("name도 없으면 email local-part를 사용한다", () => {
    expect(
      buildMemberDisplayName({
        familyName: null,
        givenName: null,
        name: "",
        email: "member.user@example.com",
      }),
    ).toBe("member.user");
  });

  it("모든 정보가 없으면 기본값을 반환한다", () => {
    expect(buildMemberDisplayName({})).toBe("이름 미등록");
  });
});

describe("buildMemberDisplayInitial", () => {
  it("표시 이름의 첫 글자를 반환한다", () => {
    expect(buildMemberDisplayInitial("김연영")).toBe("김");
  });

  it("빈 문자열이면 물음표를 반환한다", () => {
    expect(buildMemberDisplayInitial(" ")).toBe("?");
  });
});
