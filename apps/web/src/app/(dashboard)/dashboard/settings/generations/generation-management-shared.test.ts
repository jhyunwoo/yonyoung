import { describe, expect, it } from "vitest";
import type { ApiUser } from "../../../../../lib/admin-api/types";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
  filterAssignableUsers,
  mergeGenerationId,
  readNormalizedGenerationIds,
  validateGenerationFormInput,
} from "./generation-management-shared";

const createUser = (input: Partial<ApiUser>): ApiUser => ({
  id: input.id ?? "user-1",
  name: input.name ?? "홍길동",
  email: input.email ?? "user@example.com",
  image: input.image !== undefined ? input.image : null,
  familyName: input.familyName !== undefined ? input.familyName : null,
  givenName: input.givenName !== undefined ? input.givenName : null,
  college: input.college !== undefined ? input.college : null,
  department: input.department !== undefined ? input.department : null,
  studentNumber: input.studentNumber !== undefined ? input.studentNumber : null,
  phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : null,
  collaborationAvailable:
    input.collaborationAvailable !== undefined ? input.collaborationAvailable : false,
  personalLink: input.personalLink !== undefined ? input.personalLink : null,
  role: input.role !== undefined ? input.role : "regular_member",
  generationId: input.generationId !== undefined ? input.generationId : null,
  generationIds: input.generationIds ?? [],
  createdAt: input.createdAt ?? 0,
  updatedAt: input.updatedAt ?? 0,
  updatedBy: input.updatedBy ?? null,
});

describe("generation-management-shared", () => {
  it("validateGenerationFormInput은 유효한 입력을 payload로 변환한다", () => {
    const result = validateGenerationFormInput({
      name: " 60기 ",
      sortOrderInput: "60",
      startDateInput: "2030-03-01",
      endDateInput: "2030-03-31",
    });

    expect("payload" in result).toBe(true);
    if ("payload" in result) {
      expect(result.payload.name).toBe("60기");
      expect(result.payload.sortOrder).toBe(60);
      expect(result.payload.startDate).toBeLessThanOrEqual(result.payload.endDate);
    }
  });

  it("validateGenerationFormInput은 시작일이 종료일보다 늦으면 오류를 반환한다", () => {
    const result = validateGenerationFormInput({
      name: "60기",
      sortOrderInput: "60",
      startDateInput: "2030-04-01",
      endDateInput: "2030-03-01",
    });

    expect("errorMessage" in result).toBe(true);
    if ("errorMessage" in result) {
      expect(result.errorMessage).toContain("시작일");
    }
  });

  it("readNormalizedGenerationIds는 generationId와 generationIds를 중복 없이 합친다", () => {
    const generationIds = readNormalizedGenerationIds(
      createUser({
        generationId: "gen-1",
        generationIds: ["gen-2", "gen-1", "gen-3"],
      }),
    );

    expect(new Set(generationIds)).toEqual(new Set(["gen-1", "gen-2", "gen-3"]));
  });

  it("mergeGenerationId는 기존 목록에 대상 기수를 중복 없이 추가한다", () => {
    expect(mergeGenerationId(["gen-1"], "gen-2")).toEqual(["gen-1", "gen-2"]);
    expect(mergeGenerationId(["gen-1"], "gen-1")).toEqual(["gen-1"]);
  });

  it("filterAssignableUsers는 unverified를 제외하고 역할/이름 필터를 적용한다", () => {
    const users = [
      createUser({
        id: "user-president",
        familyName: "김",
        givenName: "회장",
        role: "president",
      }),
      createUser({
        id: "user-manager",
        familyName: "박",
        givenName: "부장",
        role: "manager",
      }),
      createUser({
        id: "user-none",
        familyName: "이",
        givenName: "무직책",
        role: null,
      }),
      createUser({
        id: "user-unverified",
        familyName: "최",
        givenName: "미승인",
        role: "unverified",
      }),
    ];

    const allUsers = filterAssignableUsers({
      users,
      nameQuery: "",
      roleFilter: USER_ROLE_FILTER_ALL,
    });
    expect(allUsers.map((user) => user.id)).toEqual([
      "user-president",
      "user-manager",
      "user-none",
    ]);

    const managerUsers = filterAssignableUsers({
      users,
      nameQuery: "부장",
      roleFilter: "manager",
    });
    expect(managerUsers.map((user) => user.id)).toEqual(["user-manager"]);

    const noneRoleUsers = filterAssignableUsers({
      users,
      nameQuery: "",
      roleFilter: USER_ROLE_FILTER_NONE,
    });
    expect(noneRoleUsers.map((user) => user.id)).toEqual(["user-none"]);
  });
});
