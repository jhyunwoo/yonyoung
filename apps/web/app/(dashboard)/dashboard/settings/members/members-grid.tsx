"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { type BulkMemberRoleValue } from "@/features/dashboard/members/member-role-options";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import {
  buildMemberDirectoryFilterOptions,
  buildMemberGenerationNamesById,
  filterMemberDirectoryUsers,
} from "@/features/dashboard/members/member-directory";
import {
  addVisibleUserIds,
  hasActiveMemberFilters,
  mergeUpdatedUsers,
  summarizeMemberSelection,
  toggleSelectedUserId,
} from "@/features/dashboard/members/member-selection";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";
import MemberBulkToolbar from "@/app/(dashboard)/dashboard/settings/members/_components/member-bulk-toolbar";
import MemberCard from "@/app/(dashboard)/dashboard/settings/members/_components/member-card";
import MemberFilters, {
  type MemberFilterState,
} from "@/app/(dashboard)/dashboard/settings/members/_components/member-filters";

const EMPTY_FILTERS: MemberFilterState = {
  query: "",
  college: "",
  department: "",
  generationId: "",
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "전체 멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

type MembersGridProps = {
  initialUsers: ApiUser[];
  generations: ApiGeneration[];
};

/**
 * 목록 자체는 서버 컴포넌트가 읽어서 넘겨준다.
 * 이 컴포넌트에는 검색/필터/선택/일괄 변경처럼 사용자 상호작용으로만 바뀌는 상태만 남긴다.
 */
export default function MembersGrid({ initialUsers, generations }: MembersGridProps) {
  const confirm = useConfirm();
  const [users, setUsers] = useState<ApiUser[]>(initialUsers);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<MemberFilterState>(EMPTY_FILTERS);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<BulkMemberRoleValue>("regular_member");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  // 입력 반응성을 위해 실제 필터링만 지연시킨다(입력 자체는 즉시 반영된다).
  const deferredQuery = useDeferredValue(filters.query);

  const generationNamesById = useMemo(
    () => buildMemberGenerationNamesById(generations),
    [generations],
  );
  const filterOptions = useMemo(
    () => buildMemberDirectoryFilterOptions(users, generations),
    [users, generations],
  );
  const filteredUsers = useMemo(
    () =>
      filterMemberDirectoryUsers(users, {
        query: deferredQuery,
        college: filters.college,
        department: filters.department,
        generationId: filters.generationId,
      }),
    [deferredQuery, filters.college, filters.department, filters.generationId, users],
  );
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const selection = useMemo(
    () =>
      summarizeMemberSelection(
        selectedUserIds,
        filteredUsers.map((user) => user.id),
      ),
    [filteredUsers, selectedUserIds],
  );

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((previous) => toggleSelectedUserId(previous, userId));
    clearMessages();
  };

  const handleSelectVisibleUsers = () => {
    setSelectedUserIds((previous) =>
      addVisibleUserIds(
        previous,
        filteredUsers.map((user) => user.id),
      ),
    );
    clearMessages();
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
    clearMessages();
  };

  const handleBulkRoleUpdate = async () => {
    if (selectedUserIds.length === 0) {
      setErrorMessage("권한을 변경할 멤버를 하나 이상 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const roleLabel = buildMemberRoleLabel(selectedRole);
    const shouldUpdate = await confirm({
      title: `선택한 멤버 ${selectedUserIds.length}명의 권한을 ${roleLabel}(으)로 변경하시겠습니까?`,
      description: "변경한 권한은 즉시 적용됩니다.",
      confirmLabel: "권한 변경",
    });
    if (!shouldUpdate) {
      return;
    }

    setIsBulkUpdating(true);
    clearMessages();

    try {
      const targetIds = [...selectedUserIds];
      const updatedUsers = await adminResourceApi.bulkUpdateUsersRole({
        userIds: targetIds,
        role: selectedRole,
      });

      setUsers((previous) => mergeUpdatedUsers(previous, updatedUsers));
      setSelectedUserIds([]);
      setSuccessMessage(
        `${targetIds.length}명의 권한을 ${roleLabel}(으)로 변경했습니다.`,
      );
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsBulkUpdating(false);
    }
  };

  if (users.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken p-4 text-sm text-ink-muted">
        등록된 멤버가 없습니다.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <MemberFilters
        filters={filters}
        options={filterOptions}
        totalCount={users.length}
        visibleCount={filteredUsers.length}
        hasActiveFilters={hasActiveMemberFilters(filters)}
        onChange={(patch) => setFilters((previous) => ({ ...previous, ...patch }))}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <MemberBulkToolbar
        selection={selection}
        selectedRole={selectedRole}
        isBulkUpdating={isBulkUpdating}
        canSelectVisible={filteredUsers.length > 0}
        onRoleChange={(role) => {
          setSelectedRole(role);
          clearMessages();
        }}
        onSelectVisible={handleSelectVisibleUsers}
        onClearSelection={handleClearSelection}
        onSubmit={() => void handleBulkRoleUpdate()}
      />

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-4 rounded-lg border border-success-hairline bg-success-soft px-4 py-3 text-sm text-success-text">
          {successMessage}
        </p>
      ) : null}

      {filteredUsers.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken p-4 text-sm text-ink-muted">
          검색 또는 필터 조건에 맞는 멤버가 없습니다.
        </p>
      ) : (
        <ul
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-testid="settings-members-grid"
        >
          {filteredUsers.map((user) => (
            <MemberCard
              key={user.id}
              user={user}
              generationNamesById={generationNamesById}
              isSelected={selectedUserIdSet.has(user.id)}
              isBulkUpdating={isBulkUpdating}
              onToggle={handleToggleUser}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
