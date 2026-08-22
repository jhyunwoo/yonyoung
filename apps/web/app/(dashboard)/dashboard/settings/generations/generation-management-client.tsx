"use client";

import { Alert } from "@/app/(dashboard)/_components/ui/alert";
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
import type { GenerationFormValues } from "@/app/(dashboard)/dashboard/settings/generations/generation-management-selectors";
import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { formatKoreanDateRange } from "@/shared/utils/date-formatters";
import { FolderKanban } from "lucide-react";

/** 패널이 쓰는 필드 키를 훅의 값 키로 옮긴다. */
const FORM_FIELD_KEYS = {
  name: "name",
  sortOrder: "sortOrderInput",
  startDate: "startDateInput",
  endDate: "endDateInput",
} as const;

type PanelFieldKey = keyof typeof FORM_FIELD_KEYS;

const toPanelValues = (values: GenerationFormValues) => ({
  name: values.name,
  sortOrder: values.sortOrderInput,
  startDate: values.startDateInput,
  endDate: values.endDateInput,
});

const toValuesPatch = (
  key: PanelFieldKey,
  value: string,
): Partial<GenerationFormValues> => ({ [FORM_FIELD_KEYS[key]]: value });

type GenerationManagementClientProps = {
  initialGenerations: ApiGeneration[];
  initialUsers: ApiUser[];
};

/**
 * 전체 기수 관리 화면.
 *
 * 상태와 서버 통신은 useGenerationManagement 훅이, 각 패널의 표현은
 * generation-form-panels / generation-member-assign-panel 이 담당한다.
 * (분리 전에는 이 파일 하나가 936줄이었다.)
 */
export default function GenerationManagementClient({
  initialGenerations,
  initialUsers,
}: GenerationManagementClientProps) {
  const state = useGenerationManagement({ initialGenerations, initialUsers });

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
            values={toPanelValues(state.createValues)}
            onChange={(key, value) => state.setCreateValues(toValuesPatch(key, value))}
            onSubmit={() => void state.handleCreateGeneration()}
            disabled={state.isSavingGeneration}
          />

          <GenerationEditPanel
            hasSelection={state.selectedGeneration !== null}
            values={toPanelValues(state.editValues)}
            onChange={(key, value) => state.setEditValues(toValuesPatch(key, value))}
            onSubmit={() => void state.handleUpdateGeneration()}
            onDelete={() => void state.handleDeleteGeneration()}
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
          onAssign={() => void state.handleAssignUsersToGeneration()}
          onRemove={() => void state.handleRemoveUsersFromGeneration()}
          isAssigning={state.isAssigningUsers}
          isRemoving={state.isRemovingUsers}
          isSavingGeneration={state.isSavingGeneration}
        />
      </div>
    </>
  );
}
