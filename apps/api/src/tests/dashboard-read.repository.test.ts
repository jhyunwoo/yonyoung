import { describe, expect, it } from "vitest";
import { createDashboardReadRepository } from "../features/dashboard/dashboard-read.repository";
import {
  generations,
  linktreeItems,
  user,
} from "../platform/db/schema";
import { createFakeDatabase } from "./support/fake-database";

describe("dashboard read repository", () => {
  it("세대 필터가 없으면 전체 집계와 세대별 0 값을 반환한다", async () => {
    const fake = createFakeDatabase();
    fake.queueSelect(user, [{ value: 11 }]);
    fake.queueSelect(user, [{ value: 2 }]);
    fake.queueSelect(generations, [{ value: 3 }]);
    fake.queueSelect(linktreeItems, [{ value: 4 }]);

    const repository = createDashboardReadRepository(fake.db);

    await expect(repository.getAdminDashboardStats(null)).resolves.toEqual({
      usersTotal: 11,
      unverifiedUsersTotal: 2,
      generationsTotal: 3,
      selectedGenerationMembersTotal: 0,
      selectedGenerationActivitiesTotal: 0,
      selectedGenerationExhibitionsTotal: 0,
      linktreeLinksTotal: 4,
    });
  });

  it("유한하지 않은 세대 정렬값과 비어 있는 집계 결과를 0으로 정규화한다", async () => {
    const fake = createFakeDatabase();
    const repository = createDashboardReadRepository(fake.db);

    await expect(repository.getAdminDashboardStats(Number.NaN)).resolves.toEqual({
      usersTotal: 0,
      unverifiedUsersTotal: 0,
      generationsTotal: 0,
      selectedGenerationMembersTotal: 0,
      selectedGenerationActivitiesTotal: 0,
      selectedGenerationExhibitionsTotal: 0,
      linktreeLinksTotal: 0,
    });
  });
});
