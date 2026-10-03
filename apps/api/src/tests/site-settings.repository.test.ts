import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SITE_SETTINGS } from "@yonyoung/contracts";
import { createSiteSettingsRepository } from "../features/site-settings/site-settings.repository";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "default",
  ...DEFAULT_SITE_SETTINGS,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

const createDb = (batchResult: unknown[]) => {
  const chain = () => {
    const query: Record<string, unknown> = {};
    for (const method of ["from", "where", "limit", "values", "onConflictDoUpdate"]) {
      query[method] = () => query;
    }
    return query;
  };
  const batch = vi.fn(async () => batchResult);
  return {
    batch,
    db: {
      query: { siteSettings: { findFirst: vi.fn(async () => row()) } },
      select: vi.fn(chain),
      insert: vi.fn(chain),
      batch,
    },
  };
};

describe("site settings repository", () => {
  it("저장과 같은 batch 안의 직전·직후 조회로 실제로 바뀐 항목만 돌려준다", async () => {
    // 동시 저장으로 직전 값이 이미 "다른은행"으로 바뀐 상황: 요청을 보낸 폼이 본 값이 아니라
    // 트랜잭션이 실제로 덮어쓴 값을 기준으로 비교해야 한다.
    const { db, batch } = createDb([
      [row({ donateBankName: "다른은행", donateAccountHolder: "연영회" })],
      undefined,
      [row({ donateBankName: "테스트은행", donateAccountHolder: "연영회" })],
    ]);
    const repository = createSiteSettingsRepository(db as never);

    const result = await repository.updateSiteSettings({
      donateBankName: "테스트은행",
      donateAccountHolder: "연영회",
    });

    expect(batch).toHaveBeenCalledTimes(1);
    expect((batch.mock.calls[0] as unknown as [unknown[]])[0]).toHaveLength(3);
    expect(result.settings.donateBankName).toBe("테스트은행");
    expect(result.changedFields).toEqual(["donateBankName"]);
  });

  it("값이 그대로면 바뀐 항목이 없다", async () => {
    const { db } = createDb([[row()], undefined, [row()]]);
    const repository = createSiteSettingsRepository(db as never);

    const result = await repository.updateSiteSettings({
      donateBankName: DEFAULT_SITE_SETTINGS.donateBankName,
    });

    expect(result.changedFields).toEqual([]);
  });
});
