/**
 * 멤버 선택 상태 계산. 필터로 가려진 선택도 유지해야 하므로,
 * "보이는 선택"과 "가려진 선택"을 나눠서 표시한다.
 */
export type MemberSelectionSummary = {
  totalSelectedCount: number;
  visibleSelectedCount: number;
  hiddenSelectedCount: number;
};

export const toggleSelectedUserId = (
  selectedUserIds: readonly string[],
  userId: string,
): string[] => {
  if (selectedUserIds.includes(userId)) {
    return selectedUserIds.filter((id) => id !== userId);
  }

  return [...selectedUserIds, userId];
};

export const addVisibleUserIds = (
  selectedUserIds: readonly string[],
  visibleUserIds: readonly string[],
): string[] => {
  const next = new Set(selectedUserIds);
  for (const userId of visibleUserIds) {
    next.add(userId);
  }
  return [...next];
};

export const summarizeMemberSelection = (
  selectedUserIds: readonly string[],
  visibleUserIds: readonly string[],
): MemberSelectionSummary => {
  const visible = new Set(visibleUserIds);
  const visibleSelectedCount = selectedUserIds.filter((userId) =>
    visible.has(userId),
  ).length;

  return {
    totalSelectedCount: selectedUserIds.length,
    visibleSelectedCount,
    hiddenSelectedCount: selectedUserIds.length - visibleSelectedCount,
  };
};

/** 일괄 권한 변경 응답을 기존 목록에 병합한다. 응답에 없는 사용자는 그대로 둔다. */
export const mergeUpdatedUsers = <T extends { id: string }>(
  users: readonly T[],
  updatedUsers: readonly T[],
): T[] => {
  const updatedById = new Map(updatedUsers.map((user) => [user.id, user]));
  return users.map((user) => updatedById.get(user.id) ?? user);
};

export const hasActiveMemberFilters = (filters: {
  query: string;
  college: string;
  department: string;
  generationId: string;
}): boolean =>
  filters.query.trim().length > 0 ||
  filters.college.length > 0 ||
  filters.department.length > 0 ||
  filters.generationId.length > 0;
