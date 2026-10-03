import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecruitingPlanRepository } from "../features/recruiting-plan/recruiting-plan.repository";
import { recruitingPlans } from "../platform/db/schema";
import { createFakeDatabase } from "./support/fake-database";

const planRow = (overrides: Record<string, unknown> = {}) => ({
  year: 2031,
  title: "2031 봄 모집",
  content: "<p>모집</p>",
  promotionImageUrls: "[]",
  recruitmentStartAt: new Date("2031-01-05T00:00:00.000Z"),
  recruitmentEndAt: new Date("2031-01-20T00:00:00.000Z"),
  createdAt: new Date("2030-12-01T00:00:00.000Z"),
  updatedAt: new Date("2030-12-01T00:00:00.000Z"),
  ...overrides,
});

describe("recruiting plan repository", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("해를 넘기는 모집은 새해 0시가 지나도 진행 중인 계획을 돌려준다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-12-31T15:30:00.000Z")); // 2031-01-01 00:30 KST
    const fake = createFakeDatabase();
    const repository = createRecruitingPlanRepository(fake.db);
    fake.queueSelect(recruitingPlans, [
      planRow({
        year: 2030,
        recruitmentStartAt: new Date("2030-12-20T00:00:00.000Z"),
        recruitmentEndAt: new Date("2031-01-10T00:00:00.000Z"),
      }),
    ]);

    const plan = await repository.getCurrentRecruitingPlan();

    expect(plan?.year).toBe(2030);
  });

  it("진행 중·예정 계획이 없으면 올해 계획으로 폴백한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-06-01T00:00:00.000Z"));
    const fake = createFakeDatabase();
    const repository = createRecruitingPlanRepository(fake.db);
    fake.queueSelect(recruitingPlans, []);
    fake.queueFindFirst("recruitingPlans", planRow());

    const plan = await repository.getCurrentRecruitingPlan();

    expect(plan?.title).toBe("2031 봄 모집");
  });

  it("모집 시작일이 속한 한국 연도로 저장해 12월에 등록한 다음 해 계획이 올해 계획을 덮지 않는다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-12-10T00:00:00.000Z"));
    const fake = createFakeDatabase();
    const insertedValues: unknown[] = [];
    (fake.db as unknown as { insert: unknown }).insert = vi.fn(() => ({
      values: (values: unknown) => {
        insertedValues.push(values);
        return { onConflictDoUpdate: async () => undefined };
      },
    }));
    const repository = createRecruitingPlanRepository(fake.db);
    fake.queueFindFirst("recruitingPlans", planRow());

    await repository.upsertCurrentRecruitingPlan({
      title: "2031 봄 모집",
      content: "<p>모집</p>",
      promotionImageUrls: [],
      // 2031-01-01 00:00 KST
      recruitmentStartAt: new Date("2030-12-31T15:00:00.000Z"),
      recruitmentEndAt: new Date("2031-01-20T00:00:00.000Z"),
    });

    expect(insertedValues[0]).toMatchObject({ year: 2031 });
  });
});
