import { describe, expect, it } from "vitest";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import {
  EMPTY_GENERATION_FORM_VALUES,
  buildGenerationAssignTargets,
  buildGenerationRemoveTargets,
  buildRoleFilterOptions,
  readRoleFilterLabel,
  resolveActiveRoleFilter,
  resolveSelectedGenerationId,
  toGenerationFormValues,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-selectors";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";

const createGeneration = (
  overrides: Partial<ApiGeneration> & Pick<ApiGeneration, "id">,
): ApiGeneration => ({
  name: "59기",
  sortOrder: 59,
  startDate: Date.UTC(2030, 0, 1),
  endDate: Date.UTC(2030, 11, 31),
  createdAt: 1,
  updatedAt: 1,
  updatedBy: null,
  ...overrides,
});

const createUser = (
  overrides: Partial<ApiUser> & Pick<ApiUser, "id">,
): ApiUser => ({
  name: "tester",
  email: "tester@example.com",
  image: null,
  showcaseImageUrls: [],
  familyName: null,
  givenName: null,
  college: null,
  department: null,
  studentNumber: null,
  phoneNumber: null,
  collaborationAvailable: false,
  personalLink: null,
  role: "regular_member",
  generationId: null,
  generationIds: [],
  createdAt: 1,
  updatedAt: 1,
  updatedBy: null,
  ...overrides,
});

describe("role filter options", () => {
  it("실제 존재하는 권한만 옵션으로 만든다", () => {
    const options = buildRoleFilterOptions([
      createUser({ id: "a", role: "manager" }),
      createUser({ id: "b", role: "regular_member" }),
    ]);

    expect(options).toEqual([USER_ROLE_FILTER_ALL, "manager", "regular_member"]);
  });

  it("unverified 사용자는 옵션을 만들지 않는다", () => {
    expect(
      buildRoleFilterOptions([createUser({ id: "a", role: "unverified" })]),
    ).toEqual([USER_ROLE_FILTER_ALL]);
  });

  it("역할이 비어 있는 사용자는 '미지정' 옵션으로 묶는다", () => {
    expect(buildRoleFilterOptions([createUser({ id: "a", role: null })])).toEqual([
      USER_ROLE_FILTER_ALL,
      USER_ROLE_FILTER_NONE,
    ]);
  });

  it("알려지지 않은 권한은 뒤쪽에 가나다순으로 붙인다", () => {
    const options = buildRoleFilterOptions([
      createUser({ id: "a", role: "custom_z" }),
      createUser({ id: "b", role: "custom_a" }),
      createUser({ id: "c", role: "manager" }),
    ]);

    expect(options).toEqual([
      USER_ROLE_FILTER_ALL,
      "manager",
      "custom_a",
      "custom_z",
    ]);
  });

  it("선택한 필터가 목록에서 사라지면 전체로 되돌린다", () => {
    expect(resolveActiveRoleFilter("manager", [USER_ROLE_FILTER_ALL])).toBe(
      USER_ROLE_FILTER_ALL,
    );
  });

  it("선택한 필터가 아직 유효하면 그대로 둔다", () => {
    expect(
      resolveActiveRoleFilter("manager", [USER_ROLE_FILTER_ALL, "manager"]),
    ).toBe("manager");
  });

  it("특수 필터 값은 사람이 읽는 라벨로 바꾼다", () => {
    expect(readRoleFilterLabel(USER_ROLE_FILTER_ALL)).toBe("전체 권한");
    expect(readRoleFilterLabel(USER_ROLE_FILTER_NONE)).toBe("역할 미지정");
  });
});

describe("selected generation", () => {
  const generations = [
    createGeneration({ id: "gen-59" }),
    createGeneration({ id: "gen-58", name: "58기", sortOrder: 58 }),
  ];

  it("선택이 없으면 첫 기수를 고른다", () => {
    expect(resolveSelectedGenerationId(generations, null)).toBe("gen-59");
  });

  it("선택한 기수가 남아 있으면 유지한다", () => {
    expect(resolveSelectedGenerationId(generations, "gen-58")).toBe("gen-58");
  });

  it("선택한 기수가 사라졌으면 첫 기수로 되돌린다", () => {
    expect(resolveSelectedGenerationId(generations, "gen-1")).toBe("gen-59");
  });

  it("기수가 하나도 없으면 선택도 없다", () => {
    expect(resolveSelectedGenerationId([], "gen-59")).toBeNull();
  });
});

describe("generation form values", () => {
  it("선택된 기수를 폼 입력 형식으로 바꾼다", () => {
    expect(toGenerationFormValues(createGeneration({ id: "gen-59" }))).toEqual({
      name: "59기",
      sortOrderInput: "59",
      startDateInput: "2030-01-01",
      endDateInput: "2030-12-31",
    });
  });

  it("선택이 없으면 빈 폼이다", () => {
    expect(toGenerationFormValues(null)).toEqual(EMPTY_GENERATION_FORM_VALUES);
  });
});

describe("generation assignment targets", () => {
  const users = [
    createUser({ id: "a", generationIds: [] }),
    createUser({ id: "b", generationIds: ["gen-59"] }),
    createUser({ id: "c", generationIds: ["gen-58"] }),
  ];

  it("이미 그 기수에 속한 사용자는 추가 대상에서 뺀다", () => {
    const targets = buildGenerationAssignTargets({
      users,
      selectedUserIds: ["a", "b"],
      generationId: "gen-59",
    });

    expect(targets).toEqual([{ userId: "a", generationIds: ["gen-59"] }]);
  });

  it("선택하지 않은 사용자는 건드리지 않는다", () => {
    expect(
      buildGenerationAssignTargets({
        users,
        selectedUserIds: [],
        generationId: "gen-59",
      }),
    ).toEqual([]);
  });

  it("그 기수에 속하지 않은 사용자는 제거 대상에서 뺀다", () => {
    const targets = buildGenerationRemoveTargets({
      users,
      selectedUserIds: ["a", "b", "c"],
      generationId: "gen-59",
    });

    expect(targets).toEqual([{ userId: "b", generationIds: [] }]);
  });

  it("제거해도 다른 기수 배정은 남는다", () => {
    const targets = buildGenerationRemoveTargets({
      users: [createUser({ id: "d", generationIds: ["gen-59", "gen-58"] })],
      selectedUserIds: ["d"],
      generationId: "gen-59",
    });

    expect(targets).toEqual([{ userId: "d", generationIds: ["gen-58"] }]);
  });
});
