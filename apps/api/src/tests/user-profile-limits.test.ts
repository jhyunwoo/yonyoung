import { describe, expect, it } from "vitest";
import {
  ApiAdminUpdateUserSchema,
  ApiMemberProfileUpdateSchema,
} from "../features/users/user.contract";

// 프로필 글자는 임원의 대시보드와 MCP 도구 결과에 그대로 실린다. 미인증 가입자도 자기
// 프로필을 쓸 수 있으므로, 길이 제한이 없으면 긴 지시문을 심는 통로가 된다.
describe("프로필 텍스트 길이 제한", () => {
  const schemas = [
    ["본인 수정", ApiMemberProfileUpdateSchema],
    ["관리자 수정", ApiAdminUpdateUserSchema],
  ] as const;

  for (const [label, schema] of schemas) {
    it(`${label}: 일반적인 값은 통과한다`, () => {
      expect(
        schema.safeParse({
          familyName: "남궁",
          givenName: "Maximilian Alexander",
          college: "언더우드국제대학",
          department: "글로벌인재학부 문화디자인경영전공",
        }).success,
      ).toBe(true);
    });

    it(`${label}: 지나치게 긴 값은 거부한다`, () => {
      expect(schema.safeParse({ familyName: "가".repeat(51) }).success).toBe(false);
      expect(schema.safeParse({ givenName: "가".repeat(51) }).success).toBe(false);
      expect(schema.safeParse({ college: "가".repeat(101) }).success).toBe(false);
      expect(schema.safeParse({ department: "가".repeat(101) }).success).toBe(false);
    });
  }

  it("관리자 수정: 표시 이름도 길이를 제한한다", () => {
    expect(ApiAdminUpdateUserSchema.safeParse({ name: "가".repeat(100) }).success).toBe(true);
    expect(ApiAdminUpdateUserSchema.safeParse({ name: "가".repeat(101) }).success).toBe(false);
  });
  it("URL 입력도 길이를 제한한다", () => {
    const longUrl = `https://example.com/${"a".repeat(2100)}`;
    for (const [, schema] of schemas) {
      expect(schema.safeParse({ personalLink: "https://example.com/portfolio" }).success).toBe(true);
      expect(schema.safeParse({ personalLink: longUrl }).success).toBe(false);
      expect(schema.safeParse({ image: longUrl }).success).toBe(false);
      expect(schema.safeParse({ showcaseImageUrls: [longUrl] }).success).toBe(false);
    }
  });
});
