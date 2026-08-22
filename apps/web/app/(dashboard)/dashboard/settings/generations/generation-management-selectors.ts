import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
  formatTimestampToDateInput,
  mergeGenerationId,
  readNormalizedGenerationIds,
  removeGenerationId,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";

/** 필터 select에서 흔한 권한을 위쪽에 고정하기 위한 표시 순서. */
const ROLE_FILTER_ORDER = [
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  USER_ROLE_FILTER_NONE,
] as const;

/** 권한 필터 select 의 라벨. 특수 값(전체/미지정)을 사람이 읽는 말로 바꾼다. */
export const readRoleFilterLabel = (roleFilterValue: string): string => {
  if (roleFilterValue === USER_ROLE_FILTER_ALL) {
    return "전체 권한";
  }

  if (roleFilterValue === USER_ROLE_FILTER_NONE) {
    return "역할 미지정";
  }

  const roleLabel = buildMemberRoleLabel(roleFilterValue);
  return roleLabel === "역할 미지정" ? roleFilterValue : roleLabel;
};

/** 실제 사용자 목록에 존재하는 권한만 필터 옵션으로 노출한다(unverified 제외). */
export const buildRoleFilterOptions = (users: readonly ApiUser[]): string[] => {
  const roleSet = new Set<string>();
  for (const user of users) {
    if (user.role === "unverified") {
      continue;
    }

    roleSet.add(user.role ? user.role : USER_ROLE_FILTER_NONE);
  }

  const orderedRoles = ROLE_FILTER_ORDER.filter((role) => roleSet.has(role));
  const customRoles = [...roleSet]
    .filter(
      (role) => !ROLE_FILTER_ORDER.includes(role as (typeof ROLE_FILTER_ORDER)[number]),
    )
    .sort((left, right) => left.localeCompare(right, "ko"));

  return [USER_ROLE_FILTER_ALL, ...orderedRoles, ...customRoles];
};

/**
 * 선택된 권한 필터가 더 이상 목록에 없으면 "전체"로 되돌린다.
 * effect로 state를 되돌리는 대신 렌더 단계에서 바로 계산한다.
 */
export const resolveActiveRoleFilter = (
  roleFilter: string,
  roleFilterOptions: readonly string[],
): string => (roleFilterOptions.includes(roleFilter) ? roleFilter : USER_ROLE_FILTER_ALL);

/** 목록이 바뀌었을 때 유지할 선택 기수. 사라졌으면 첫 기수로 되돌린다. */
export const resolveSelectedGenerationId = (
  generations: readonly ApiGeneration[],
  selectedGenerationId: string | null,
): string | null => {
  if (
    selectedGenerationId &&
    generations.some((generation) => generation.id === selectedGenerationId)
  ) {
    return selectedGenerationId;
  }

  return generations[0]?.id ?? null;
};

export type GenerationFormValues = {
  name: string;
  sortOrderInput: string;
  startDateInput: string;
  endDateInput: string;
};

export const EMPTY_GENERATION_FORM_VALUES: GenerationFormValues = {
  name: "",
  sortOrderInput: "",
  startDateInput: "",
  endDateInput: "",
};

export const toGenerationFormValues = (
  generation: ApiGeneration | null,
): GenerationFormValues => {
  if (!generation) {
    return EMPTY_GENERATION_FORM_VALUES;
  }

  return {
    name: generation.name,
    sortOrderInput: String(generation.sortOrder),
    startDateInput: formatTimestampToDateInput(generation.startDate),
    endDateInput: formatTimestampToDateInput(generation.endDate),
  };
};

export type GenerationAssignmentTarget = {
  userId: string;
  generationIds: string[];
};

/** 이미 그 기수에 속한 사용자는 호출 대상에서 뺀다. */
export const buildGenerationAssignTargets = (input: {
  users: readonly ApiUser[];
  selectedUserIds: readonly string[];
  generationId: string;
}): GenerationAssignmentTarget[] => {
  const selected = new Set(input.selectedUserIds);

  return input.users
    .filter((user) => selected.has(user.id))
    .map((user) => {
      const currentGenerationIds = readNormalizedGenerationIds(user);
      const nextGenerationIds = mergeGenerationId(
        currentGenerationIds,
        input.generationId,
      );
      if (currentGenerationIds.length === nextGenerationIds.length) {
        return null;
      }

      return { userId: user.id, generationIds: nextGenerationIds };
    })
    .filter((target): target is GenerationAssignmentTarget => target !== null);
};

/** 그 기수에 속하지 않은 사용자는 호출 대상에서 뺀다. */
export const buildGenerationRemoveTargets = (input: {
  users: readonly ApiUser[];
  selectedUserIds: readonly string[];
  generationId: string;
}): GenerationAssignmentTarget[] => {
  const selected = new Set(input.selectedUserIds);

  return input.users
    .filter((user) => selected.has(user.id))
    .map((user) => {
      const currentGenerationIds = readNormalizedGenerationIds(user);
      if (!currentGenerationIds.includes(input.generationId)) {
        return null;
      }

      return {
        userId: user.id,
        generationIds: removeGenerationId(currentGenerationIds, input.generationId),
      };
    })
    .filter((target): target is GenerationAssignmentTarget => target !== null);
};
