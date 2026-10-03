import { describe, expect, it } from "vitest";
import { apiReorderGenerationsInputSchema } from "@yonyoung/contracts/generations";

describe("apiReorderGenerationsInputSchema", () => {
  it("두 기수의 자리 맞바꾸기를 허용한다", () => {
    expect(
      apiReorderGenerationsInputSchema.safeParse({
        items: [
          { id: "gen-58", sortOrder: 59 },
          { id: "gen-59", sortOrder: 58 },
        ],
      }).success,
    ).toBe(true);
  });

  it("같은 기수나 같은 정렬 순서가 두 번 나오면 거절한다", () => {
    expect(
      apiReorderGenerationsInputSchema.safeParse({
        items: [
          { id: "gen-58", sortOrder: 1 },
          { id: "gen-58", sortOrder: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(
      apiReorderGenerationsInputSchema.safeParse({
        items: [
          { id: "gen-58", sortOrder: 1 },
          { id: "gen-59", sortOrder: 1 },
        ],
      }).success,
    ).toBe(false);
  });

  it("빈 요청과 음수 순서를 거절한다", () => {
    expect(
      apiReorderGenerationsInputSchema.safeParse({ items: [] }).success,
    ).toBe(false);
    expect(
      apiReorderGenerationsInputSchema.safeParse({
        items: [{ id: "gen-58", sortOrder: -1 }],
      }).success,
    ).toBe(false);
  });
});
