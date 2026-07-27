"use client";

import { Alert } from "@/app/(dashboard)/_components/ui/alert";
import { Card } from "@/app/(dashboard)/_components/ui/card";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import { PageHeader } from "@/app/(dashboard)/_components/ui/page-header";
import {
  GenerationCreatePanel,
  GenerationEditPanel,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-form-panels";
import { GenerationMemberAssignPanel } from "@/app/(dashboard)/dashboard/settings/generations/generation-member-assign-panel";
import {
  readRoleFilterLabel,
  useGenerationManagement,
} from "@/app/(dashboard)/dashboard/settings/generations/use-generation-management";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban } from "lucide-react";

/**
 * 전체 기수 관리 화면.
 *
 * 상태와 서버 통신은 useGenerationManagement 훅이, 각 패널의 표현은
 * generation-form-panels / generation-member-assign-panel 이 담당한다.
 * (분리 전에는 이 파일 하나가 936줄이었다.)
 */
export default function GenerationManagementClient() {
  const state = useGenerationManagement();

  return (
    <>
      <PageHeader
        eyebrow="설정"
        title="전체 기수 관리"
        description="기수를 만들고 수정하거나 삭제할 수 있고, 멤버를 원하는 기수에 배정하거나 제거할 수 있습니다."
      />

      {state.errorMessage !== null && <Alert tone="danger">{state.errorMessage}</Alert>}
      {state.successMessage !== null && (
        <Alert tone="success">{state.successMessage}</Alert>
      )}

      {state.isLoading ? (
        <div
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"
          aria-hidden="true"
        >
          <div className="space-y-4">
            <Card padding="sm" tone="sunken">
              <Skeleton className="h-5 w-32" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={`generation-loading-list-${index + 1}`}
                    className="h-12 w-full"
                  />
                ))}
              </div>
            </Card>
            <Card padding="sm">
              <Skeleton className="h-5 w-24" />
              <div className="mt-3 grid gap-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </Card>
          </div>
          <Card padding="sm">
            <Skeleton className="h-5 w-40" />
            <div className="mt-3 grid gap-2">
              <Skeleton className="h-11 w-full" />
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`generation-loading-members-${index + 1}`}
                  className="h-11 w-full"
                />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-4">
            <article className="rounded-lg border border-hairline bg-surface-sunken p-4">
              <h2 className="text-title text-ink">전체 기수 목록</h2>
              {state.generations.length === 0 ? (
                <EmptyState
                  className="mt-3"
                  Icon={FolderKanban}
                  accent="purple"
                  title="등록된 기수가 없습니다"
                  description="아래 '기수 생성'에서 첫 기수를 만들어 주세요."
                />
              ) : (
                <ul className="mt-3 space-y-2">
                  {state.generations.map((generation) => {
                    const isSelected = generation.id === state.selectedGenerationId;

                    return (
                      <li key={generation.id}>
                        <button
                          type="button"
                          data-testid={`generation-select-${generation.id}`}
                          aria-pressed={isSelected}
                          onClick={() => state.setSelectedGenerationId(generation.id)}
                          className={`w-full rounded-lg border px-3 py-3 text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
                            isSelected
                              ? "border-primary bg-primary-soft text-ink"
                              : "border-hairline bg-surface text-ink hover:border-hairline-strong"
                          }`}
                        >
                          <span className="block text-body-sm font-semibold">
                            {generation.name}
                          </span>
                          <span className="mt-1 block text-caption text-ink-muted">
                            정렬 순서 {generation.sortOrder} ·{" "}
                            {formatKoreanDateRange(
                              generation.startDate,
                              generation.endDate,
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>

            <GenerationCreatePanel
              values={{
                name: state.createName,
                sortOrder: state.createSortOrderInput,
                startDate: state.createStartDateInput,
                endDate: state.createEndDateInput,
              }}
              onChange={(key, value) => {
                if (key === "name") state.setCreateName(value);
                else if (key === "sortOrder") state.setCreateSortOrderInput(value);
                else if (key === "startDate") state.setCreateStartDateInput(value);
                else state.setCreateEndDateInput(value);
              }}
              onSubmit={state.handleCreateGeneration}
              disabled={state.isSavingGeneration}
            />

            <GenerationEditPanel
              hasSelection={state.selectedGeneration !== null}
              values={{
                name: state.editName,
                sortOrder: state.editSortOrderInput,
                startDate: state.editStartDateInput,
                endDate: state.editEndDateInput,
              }}
              onChange={(key, value) => {
                if (key === "name") state.setEditName(value);
                else if (key === "sortOrder") state.setEditSortOrderInput(value);
                else if (key === "startDate") state.setEditStartDateInput(value);
                else state.setEditEndDateInput(value);
              }}
              onSubmit={state.handleUpdateGeneration}
              onDelete={state.handleDeleteGeneration}
              disabled={state.isSavingGeneration}
            />
          </div>

          <GenerationMemberAssignPanel
            selectedGeneration={state.selectedGeneration}
            filteredUsers={state.filteredUsers}
            selectedUserIds={state.selectedUserIds}
            selectedUserIdSet={state.selectedUserIdSet}
            nameQuery={state.nameQuery}
            onNameQueryChange={state.setNameQuery}
            roleFilter={state.roleFilter}
            onRoleFilterChange={state.setRoleFilter}
            roleFilterOptions={state.roleFilterOptions}
            readRoleFilterLabel={readRoleFilterLabel}
            onToggleUser={state.handleToggleUser}
            onSelectVisibleUsers={state.handleSelectVisibleUsers}
            onClearSelection={state.handleClearSelectedUsers}
            onAssign={state.handleAssignUsersToGeneration}
            onRemove={state.handleRemoveUsersFromGeneration}
            isAssigning={state.isAssigningUsers}
            isRemoving={state.isRemovingUsers}
            isSavingGeneration={state.isSavingGeneration}
          />
        </div>
      )}
    </>
  );
}
