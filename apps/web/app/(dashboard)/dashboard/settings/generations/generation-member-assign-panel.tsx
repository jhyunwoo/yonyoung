"use client";

import { Button } from "@/app/(dashboard)/_components/ui/button";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { Field } from "@/app/(dashboard)/_components/ui/field";
import { Input, Select } from "@/app/(dashboard)/_components/ui/input";
import { buildMemberDisplayName } from "@/features/dashboard/members/display-name";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";
import { readNormalizedGenerationIds } from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { UsersRound } from "lucide-react";

type GenerationMemberAssignPanelProps = {
  selectedGeneration: ApiGeneration | null;
  filteredUsers: ApiUser[];
  selectedUserIds: string[];
  selectedUserIdSet: Set<string>;
  nameQuery: string;
  onNameQueryChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  roleFilterOptions: string[];
  readRoleFilterLabel: (value: string) => string;
  onToggleUser: (userId: string) => void;
  onSelectVisibleUsers: () => void;
  onClearSelection: () => void;
  onAssign: () => void;
  onRemove: () => void;
  isAssigning: boolean;
  isRemoving: boolean;
  isSavingGeneration: boolean;
};

/**
 * 멤버 기수 배정 / 제거 패널.
 *
 * generation-management-client.tsx(936줄)에서 분리했다. 상태는 전부 부모가
 * 들고 있고 이 컴포넌트는 표현만 담당한다.
 *
 * 선택 상태를 파란 단색 채움이 아니라 소프트 틴트로 표현하는 이유: 카드 안에
 * 보조 텍스트와 뱃지가 여러 개 들어가는데 단색 채움 위에서는 그 색을 전부
 * 뒤집어야 하고, 하나라도 빠뜨리면 대비가 깨진다(axe color-contrast).
 */
export const GenerationMemberAssignPanel = ({
  selectedGeneration,
  filteredUsers,
  selectedUserIds,
  selectedUserIdSet,
  nameQuery,
  onNameQueryChange,
  roleFilter,
  onRoleFilterChange,
  roleFilterOptions,
  readRoleFilterLabel,
  onToggleUser,
  onSelectVisibleUsers,
  onClearSelection,
  onAssign,
  onRemove,
  isAssigning,
  isRemoving,
  isSavingGeneration,
}: GenerationMemberAssignPanelProps) => {
  const isBusy = isAssigning || isRemoving || isSavingGeneration;
  const hasSelection = selectedUserIds.length > 0;
  const canMutate = selectedGeneration !== null && hasSelection && !isBusy;

  return (
    <article className="rounded-lg border border-hairline p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-title text-ink">멤버 기수 배정 / 제거</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            {selectedGeneration !== null
              ? `${selectedGeneration.name}에 추가하거나 제거할 멤버를 선택해 주세요.`
              : "멤버를 배정하려면 먼저 기수를 선택해 주세요."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="generation-assign-submit"
            variant="primary"
            onClick={onAssign}
            disabled={!canMutate}
            isPending={isAssigning}
            pendingLabel="배정 중..."
          >
            선택 사용자 추가 ({selectedUserIds.length})
          </Button>
          <Button
            data-testid="generation-remove-submit"
            variant="danger-ghost"
            onClick={onRemove}
            disabled={!canMutate}
            isPending={isRemoving}
            pendingLabel="제거 중..."
          >
            선택 사용자 제거 ({selectedUserIds.length})
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <Field label="이름 검색">
          {(control) => (
            <Input
              {...control}
              value={nameQuery}
              onChange={(event) => onNameQueryChange(event.target.value)}
              placeholder="이름으로 검색"
            />
          )}
        </Field>

        <Field label="권한 필터">
          {(control) => (
            <Select
              {...control}
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value)}
            >
              {roleFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {readRoleFilterLabel(option)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="flex flex-wrap items-end gap-2">
          <Button
            data-testid="generation-select-visible-users"
            variant="utility"
            onClick={onSelectVisibleUsers}
            disabled={filteredUsers.length === 0}
          >
            현재 목록 전체 선택
          </Button>
          <Button
            data-testid="generation-clear-selected-users"
            variant="utility"
            onClick={onClearSelection}
            disabled={!hasSelection}
          >
            선택 해제
          </Button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          className="mt-4"
          Icon={UsersRound}
          accent="teal"
          title="조건에 맞는 사용자가 없습니다"
          description="이름 검색어나 권한 필터를 바꿔 보세요."
        />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => {
            const isSelected = selectedUserIdSet.has(user.id);
            const belongsToSelectedGeneration =
              selectedGeneration !== null &&
              readNormalizedGenerationIds(user).includes(selectedGeneration.id);

            return (
              <li key={user.id}>
                <label
                  className={`block cursor-pointer rounded-lg border p-3 transition-colors duration-150 motion-reduce:transition-none ${
                    isSelected
                      ? "border-primary bg-primary-soft text-ink"
                      : "border-hairline bg-surface-sunken text-ink hover:border-hairline-strong"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleUser(user.id)}
                    className="sr-only"
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold">
                        {buildMemberDisplayName(user)}
                      </p>
                      <p className="mt-1 truncate text-caption text-ink-muted">
                        학과: {user.department?.trim() || "학과 미등록"}
                      </p>
                      <p className="mt-1 truncate text-caption text-ink-muted">
                        학번: {user.studentNumber?.trim() || "학번 미등록"}
                      </p>
                    </div>
                    <span
                      className={`rounded-md border px-2 py-1 text-eyebrow ${
                        isSelected
                          ? "border-primary-hairline bg-surface text-primary-text"
                          : "border-hairline-strong bg-surface text-ink-muted"
                      }`}
                    >
                      {isSelected ? "선택됨" : "선택"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-eyebrow ${
                        isSelected
                          ? "border-primary-hairline text-ink-secondary"
                          : "border-hairline-strong text-ink-muted"
                      }`}
                    >
                      {buildMemberRoleLabel(user.role)}
                    </span>
                    {belongsToSelectedGeneration && (
                      <span className="rounded-md border border-success-hairline bg-success-soft px-2 py-0.5 text-eyebrow text-success-text">
                        현재 기수 포함
                      </span>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
};
