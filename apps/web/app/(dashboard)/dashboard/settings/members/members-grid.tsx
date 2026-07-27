"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/display-name";
import {
  BULK_MEMBER_ROLE_OPTIONS,
  coerceBulkMemberRoleValue,
  type BulkMemberRoleValue,
} from "@/features/dashboard/members/member-role-options";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import {
  buildMemberDirectoryFilterOptions,
  buildMemberGenerationNamesById,
  filterMemberDirectoryUsers,
  readMemberGenerationNames,
} from "@/features/dashboard/members/member-directory";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "전체 멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

export default function MembersGrid() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGenerationId, setSelectedGenerationId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<BulkMemberRoleValue>("regular_member");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setLoadErrorMessage(null);

      try {
        const [rows, generationRows] = await Promise.all([
          adminResourceApi.listUsers(),
          adminResourceApi.listGenerations(),
        ]);
        if (!isMounted) {
          return;
        }
        setUsers(rows);
        setGenerations(generationRows);
        setSelectedUserIds((previous) =>
          previous.filter((userId) => rows.some((user) => user.id === userId)),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setUsers([]);
        setGenerations([]);
        setLoadErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

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
        query: deferredSearchQuery,
        college: selectedCollege,
        department: selectedDepartment,
        generationId: selectedGenerationId,
      }),
    [
      deferredSearchQuery,
      selectedCollege,
      selectedDepartment,
      selectedGenerationId,
      users,
    ],
  );
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const filteredUserIdSet = useMemo(
    () => new Set(filteredUsers.map((user) => user.id)),
    [filteredUsers],
  );
  const visibleSelectedCount = useMemo(
    () => selectedUserIds.filter((userId) => filteredUserIdSet.has(userId)).length,
    [filteredUserIdSet, selectedUserIds],
  );
  const hiddenSelectedCount = selectedUserIds.length - visibleSelectedCount;
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCollege.length > 0 ||
    selectedDepartment.length > 0 ||
    selectedGenerationId.length > 0;

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((previous) => {
      if (previous.includes(userId)) {
        return previous.filter((id) => id !== userId);
      }

      return [...previous, userId];
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSelectVisibleUsers = () => {
    setSelectedUserIds((previous) => {
      const next = new Set(previous);
      for (const user of filteredUsers) {
        next.add(user.id);
      }
      return [...next];
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
    setErrorMessage(null);
    setSuccessMessage(null);
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
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const targetIds = [...selectedUserIds];
      const updatedUsers = await adminResourceApi.bulkUpdateUsersRole({
        userIds: targetIds,
        role: selectedRole,
      });
      const updatedUserMap = new Map(updatedUsers.map((user) => [user.id, user]));

      setUsers((previous) => previous.map((user) => updatedUserMap.get(user.id) ?? user));
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

  if (isLoading) {
    return (
      <ul
        className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={`settings-members-skeleton-${index + 1}`}>
            <div className="rounded-lg border border-hairline bg-surface-sunken p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (loadErrorMessage) {
    return (
      <p className="mt-6 rounded-lg border border-danger-hairline bg-danger-soft p-4 text-sm text-danger-text">
        {loadErrorMessage}
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken p-4 text-sm text-ink-muted">
        등록된 멤버가 없습니다.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <section className="rounded-lg border border-hairline bg-surface-sunken p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-ink-secondary">멤버 검색</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="이름, 학번, 전화번호로 검색"
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
              data-testid="settings-members-search-input"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-ink-secondary">대학</span>
            <select
              value={selectedCollege}
              onChange={(event) => setSelectedCollege(event.target.value)}
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
              data-testid="settings-members-college-filter"
            >
              <option value="">전체 대학</option>
              {filterOptions.colleges.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-ink-secondary">학과</span>
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
              data-testid="settings-members-department-filter"
            >
              <option value="">전체 학과</option>
              {filterOptions.departments.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-ink-secondary">속한 기수</span>
            <select
              value={selectedGenerationId}
              onChange={(event) => setSelectedGenerationId(event.target.value)}
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink"
              data-testid="settings-members-generation-filter"
            >
              <option value="">전체 기수</option>
              {filterOptions.generations.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            총 {users.length}명 중 {filteredUsers.length}명을 보고 있습니다.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              data-testid="settings-members-filters-reset"
              onClick={() => {
                setSearchQuery("");
                setSelectedCollege("");
                setSelectedDepartment("");
                setSelectedGenerationId("");
              }}
              className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft"
            >
              검색/필터 초기화
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p
              className="text-sm font-semibold text-ink"
              data-testid="settings-members-selection-summary"
            >
              {selectedUserIds.length > 0
                ? `선택된 멤버 ${selectedUserIds.length}명`
                : "멤버를 선택해 권한을 한 번에 변경할 수 있습니다."}
            </p>
            <p className="text-xs text-ink-muted">
              현재 목록에서 {visibleSelectedCount}명이 선택되어 있습니다.
              {hiddenSelectedCount > 0
                ? ` 필터에 가려진 선택 멤버 ${hiddenSelectedCount}명도 함께 유지됩니다.`
                : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-ink-muted pr-4">
                변경할 권한
              </span>
              <select
                value={selectedRole}
                onChange={(event) => {
                  setSelectedRole(coerceBulkMemberRoleValue(event.target.value));
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                disabled={isBulkUpdating}
                data-testid="settings-members-bulk-role-select"
                className="min-w-40 rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {BULK_MEMBER_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleSelectVisibleUsers}
              disabled={filteredUsers.length === 0 || isBulkUpdating}
              data-testid="settings-members-select-visible-users"
              className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              현재 목록 전체 선택
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={selectedUserIds.length === 0 || isBulkUpdating}
              data-testid="settings-members-clear-selected-users"
              className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={handleBulkRoleUpdate}
              disabled={selectedUserIds.length === 0 || isBulkUpdating}
              data-testid="settings-members-bulk-role-submit"
              className="inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBulkUpdating
                ? "변경 중..."
                : `권한 일괄 변경 (${selectedUserIds.length})`}
            </button>
          </div>
        </div>
      </section>

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
          {filteredUsers.map((user) => {
            const displayName = buildMemberDisplayName(user);
            const avatarFallback = buildMemberDisplayInitial(displayName);
            const roleLabel = buildMemberRoleLabel(user.role);
            const generationNames = readMemberGenerationNames(user, generationNamesById);
            const isSelected = selectedUserIdSet.has(user.id);
            // 선택 상태는 파란 단색 채움이 아니라 소프트 틴트 + 파란 테두리로 표현한다.
            // 카드 안에 여러 줄의 보조 텍스트·뱃지가 들어가는데, 단색 채움 위에서는
            // 그 색들을 전부 뒤집어야 하고 그러다 대비가 깨진다(axe color-contrast).
            const cardClass = isSelected
              ? "border-primary bg-primary-soft text-ink"
              : "border-hairline bg-surface-sunken text-ink";
            const secondaryTextClass = "text-ink-muted";
            const neutralBadgeClass = isSelected
              ? "border-primary-hairline bg-surface text-ink-secondary"
              : "border-hairline-strong bg-surface text-ink-secondary";
            const emptyGenerationBadgeClass = isSelected
              ? "border-primary-hairline bg-surface text-ink-muted"
              : "border-hairline-strong bg-surface text-ink-muted";
            const linkTextClass = "text-ink hover:text-ink-secondary";

            return (
              <li key={user.id}>
                <div
                  data-testid={`settings-members-card-${user.id}`}
                  className={`flex h-full flex-col rounded-lg border p-4 transition ${cardClass}`}
                >
                  <div className="flex items-start gap-3">
                    <Link
                      href={`/dashboard/settings/members/${encodeURIComponent(user.id)}`}
                      data-testid={`settings-members-open-${user.id}`}
                      className={`flex min-w-0 flex-1 items-start gap-3 rounded-lg ${linkTextClass}`}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-hairline bg-canvas-soft">
                        {user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.image}
                            alt={`${displayName} 프로필 이미지`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-muted">
                            {avatarFallback}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{displayName}</p>
                        <p className={`truncate text-xs ${secondaryTextClass}`}>
                          {user.studentNumber?.trim() || "학번 미등록"}
                        </p>
                      </div>
                    </Link>

                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleToggleUser(user.id)}
                      disabled={isBulkUpdating}
                      data-testid={`settings-members-select-${user.id}`}
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${neutralBadgeClass}`}
                    >
                      {isSelected ? "선택됨" : "선택"}
                    </button>
                  </div>

                  <Link
                    href={`/dashboard/settings/members/${encodeURIComponent(user.id)}`}
                    data-testid={`settings-members-detail-link-${user.id}`}
                    className={`mt-3 block rounded-lg ${linkTextClass}`}
                  >
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${neutralBadgeClass}`}
                      >
                        {roleLabel}
                      </span>
                      {generationNames.length > 0 ? (
                        generationNames.map((generationName, index) => (
                          <span
                            key={`${user.id}-${index}-${generationName}`}
                            className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700"
                          >
                            {generationName}
                          </span>
                        ))
                      ) : (
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${emptyGenerationBadgeClass}`}
                        >
                          기수 미등록
                        </span>
                      )}
                    </div>

                    <div className={`mt-3 space-y-1 text-xs ${secondaryTextClass}`}>
                      <p className="truncate">대학: {user.college?.trim() || "미등록"}</p>
                      <p className="truncate">
                        학과: {user.department?.trim() || "미등록"}
                      </p>
                      <p className="truncate">
                        전화번호: {user.phoneNumber?.trim() || "미등록"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className={`text-xs font-semibold ${secondaryTextClass}`}>
                        {isSelected
                          ? "권한 변경 대상에 포함됨"
                          : "선택 후 일괄 작업 가능"}
                      </span>
                      <span className="text-xs font-semibold underline-offset-4 hover:underline">
                        상세 보기
                      </span>
                    </div>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
