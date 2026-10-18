import { describe, expect, it } from "vitest";

import { AdminApiError } from "@/shared/http/http";
import {
  findLinktreeItemById,
  normalizeLinktreeItemInput,
  normalizeLinktreeName,
  readLinktreeErrorMessage,
  sortLinktreesByName,
} from "@/app/(dashboard)/_components/linktree-shared";
import { readActivityErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";
import { readExhibitionErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
  filterAssignableUsers,
  formatTimestampToDateInput,
  mergeGenerationId,
  readNormalizedGenerationIds,
  sortGenerationsBySortOrderDesc,
  validateGenerationFormInput,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";
import type { ApiGeneration, ApiLinktree, ApiUser } from "@yonyoung/contracts";

describe("dashboard shared helpers", () => {
  it("handles linktree helpers", () => {
    const linktrees = [
      { id: "2", name: "베타", items: [] },
      { id: "1", name: "알파", items: [{ id: "item-1" }] },
    ] as unknown as ApiLinktree[];

    expect(sortLinktreesByName(linktrees).map((linktree) => linktree.id)).toEqual([
      "2",
      "1",
    ]);
    expect(findLinktreeItemById(linktrees[1], "item-1")?.id).toBe("item-1");
    expect(findLinktreeItemById(linktrees[1], "missing")).toBeNull();
    expect(normalizeLinktreeName("  공식 채널 ")).toBe("공식 채널");
    expect(
      normalizeLinktreeItemInput({ name: "  인스타 ", link: " https://x.com " }),
    ).toEqual({
      name: "인스타",
      link: "https://x.com",
    });

    expect(
      readLinktreeErrorMessage(new AdminApiError({ status: 400, message: "bad" })),
    ).toBe("bad");
  });

  it("handles activity and exhibition error messages", () => {
    expect(readActivityErrorMessage(new Error("fail"))).toBe("fail");
    expect(readExhibitionErrorMessage(new Error("fail"))).toBe("fail");
  });

  it("handles generation management helpers", () => {
    expect(formatTimestampToDateInput(new Date("2026-03-03").getTime())).toBe(
      "2026-03-03",
    );
    expect(
      validateGenerationFormInput({
        name: " 59기 ",
        sortOrderInput: "59",
        startDateInput: "2024-03-01",
        endDateInput: "2025-02-28",
      }),
    ).toEqual({
      payload: {
        name: "59기",
        sortOrder: 59,
        startDate: new Date(2024, 2, 1).getTime(),
        endDate: new Date(2025, 1, 28).getTime(),
      },
    });

    expect(
      validateGenerationFormInput({
        name: "",
        sortOrderInput: "59",
        startDateInput: "2024-03-01",
        endDateInput: "2025-02-28",
      }),
    ).toEqual({ errorMessage: "기수 이름을 입력해 주세요." });

    expect(
      sortGenerationsBySortOrderDesc([
        { id: "g1", sortOrder: 1 },
        { id: "g2", sortOrder: 2 },
      ] as unknown as ApiGeneration[]).map((generation) => generation.id),
    ).toEqual(["g2", "g1"]);

    expect(
      readNormalizedGenerationIds({
        generationId: " gen-59 ",
        generationIds: ["gen-58", "", " gen-59 "],
      } as unknown as Pick<ApiUser, "generationId" | "generationIds">),
    ).toEqual(["gen-58", "gen-59"]);

    expect(mergeGenerationId(["gen-58", " "], " gen-59 ")).toEqual(["gen-58", "gen-59"]);

    const users = [
      { id: "u1", name: "김연영", role: "regular_member", generationIds: [] },
      { id: "u2", name: "박부장", role: "manager", generationIds: [] },
      { id: "u3", name: "미승인", role: "unverified", generationIds: [] },
      { id: "u4", name: "역할없음", role: null, generationIds: [] },
    ] as unknown as ApiUser[];

    expect(
      filterAssignableUsers({
        users,
        nameQuery: "",
        roleFilter: USER_ROLE_FILTER_ALL,
      }).map((user) => user.id),
    ).toEqual(["u1", "u2", "u4"]);
    expect(
      filterAssignableUsers({
        users,
        nameQuery: "",
        roleFilter: USER_ROLE_FILTER_NONE,
      }).map((user) => user.id),
    ).toEqual(["u4"]);
    expect(
      filterAssignableUsers({ users, nameQuery: "박", roleFilter: "manager" }).map(
        (user) => user.id,
      ),
    ).toEqual(["u2"]);
  });
});
