"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";
import {
  USER_ROLE_FILTER_ALL,
  filterAssignableUsers,
  sortGenerationsBySortOrderDesc,
  validateGenerationFormInput,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";
import {
  EMPTY_GENERATION_FORM_VALUES,
  buildGenerationAssignTargets,
  buildGenerationRemoveTargets,
  buildRoleFilterOptions,
  resolveActiveRoleFilter,
  resolveSelectedGenerationId,
  toGenerationFormValues,
  type GenerationAssignmentTarget,
  type GenerationFormValues,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-selectors";
import {
  addVisibleUserIds,
  mergeUpdatedUsers,
  toggleSelectedUserId,
} from "@/features/dashboard/members/member-selection";

export { readRoleFilterLabel } from "@/app/(dashboard)/dashboard/settings/generations/generation-management-selectors";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

/** 수정 폼은 선택된 기수가 바뀌면 서버 값으로 되돌아가야 한다. */
type EditDraft = {
  generationId: string | null;
  values: GenerationFormValues;
};

type UseGenerationManagementInput = {
  initialGenerations: ApiGeneration[];
  initialUsers: ApiUser[];
};

/**
 * 기수 관리 화면의 상태와 서버 호출을 담당한다.
 *
 * 화면이 "기수 목록/생성/수정" 패널과 "멤버 배정" 패널로 나뉘는데 두 패널이
 * 같은 목록(generations, users)과 같은 저장 중 플래그를 공유한다. 그래서 상태를
 * 패널별로 쪼개지 않고 여기에 모아 두고, 패널은 표시만 하게 했다.
 *
 * 초기 목록은 서버 컴포넌트가 읽어 넘겨준다. 파생 가능한 값(선택 기수, 권한 필터
 * 옵션, 수정 폼 초기값)은 state로 복제하지 않고 렌더 단계에서 계산한다.
 */
export const useGenerationManagement = ({
  initialGenerations,
  initialUsers,
}: UseGenerationManagementInput) => {
  const router = useRouter();
  const confirm = useConfirm();

  const [generations, setGenerations] = useState<ApiGeneration[]>(() =>
    sortGenerationsBySortOrderDesc(initialGenerations),
  );
  const [users, setUsers] = useState<ApiUser[]>(initialUsers);
  const [requestedGenerationId, setRequestedGenerationId] = useState<string | null>(null);

  const [createValues, setCreateValues] = useState<GenerationFormValues>(
    EMPTY_GENERATION_FORM_VALUES,
  );
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [requestedRoleFilter, setRequestedRoleFilter] =
    useState<string>(USER_ROLE_FILTER_ALL);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isSavingGeneration, setIsSavingGeneration] = useState(false);
  const [isAssigningUsers, setIsAssigningUsers] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedGenerationId = resolveSelectedGenerationId(
    generations,
    requestedGenerationId,
  );
  const selectedGeneration =
    generations.find((generation) => generation.id === selectedGenerationId) ?? null;

  // 다른 기수를 고르면 저장해 둔 초안이 더 이상 맞지 않으므로 서버 값으로 되돌아간다.
  const editValues =
    editDraft && editDraft.generationId === selectedGenerationId
      ? editDraft.values
      : toGenerationFormValues(selectedGeneration);

  const roleFilterOptions = useMemo(() => buildRoleFilterOptions(users), [users]);
  const roleFilter = resolveActiveRoleFilter(requestedRoleFilter, roleFilterOptions);

  const filteredUsers = useMemo(
    () => filterAssignableUsers({ users, nameQuery, roleFilter }),
    [nameQuery, roleFilter, users],
  );
  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const setEditValues = (patch: Partial<GenerationFormValues>) => {
    setEditDraft({
      generationId: selectedGenerationId,
      values: { ...editValues, ...patch },
    });
  };

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleCreateGeneration = async () => {
    const validationResult = validateGenerationFormInput({
      name: createValues.name,
      sortOrderInput: createValues.sortOrderInput,
      startDateInput: createValues.startDateInput,
      endDateInput: createValues.endDateInput,
    });
    if ("errorMessage" in validationResult) {
      setErrorMessage(validationResult.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingGeneration(true);
    clearMessages();

    try {
      const created = await adminResourceApi.createGeneration(validationResult.payload);
      setGenerations((previous) =>
        sortGenerationsBySortOrderDesc([...previous, created]),
      );
      setRequestedGenerationId(created.id);
      setCreateValues(EMPTY_GENERATION_FORM_VALUES);
      setSuccessMessage("새 기수를 생성했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleUpdateGeneration = async () => {
    if (!selectedGeneration) {
      return;
    }

    const validationResult = validateGenerationFormInput({
      name: editValues.name,
      sortOrderInput: editValues.sortOrderInput,
      startDateInput: editValues.startDateInput,
      endDateInput: editValues.endDateInput,
    });
    if ("errorMessage" in validationResult) {
      setErrorMessage(validationResult.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingGeneration(true);
    clearMessages();

    try {
      const updated = await adminResourceApi.updateGeneration(
        selectedGeneration.id,
        validationResult.payload,
      );
      setGenerations((previous) =>
        sortGenerationsBySortOrderDesc(
          previous.map((generation) =>
            generation.id === updated.id ? updated : generation,
          ),
        ),
      );
      // 저장이 끝났으니 초안을 버리고 서버 값을 다시 보여 준다.
      setEditDraft(null);
      setSuccessMessage("선택한 기수 정보를 수정했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleDeleteGeneration = async () => {
    if (!selectedGeneration) {
      return;
    }

    const shouldDelete = await confirm({
      title: `"${selectedGeneration.name}" 기수를 삭제하시겠습니까?`,
      description: "기수에 배정된 멤버 정보도 함께 정리되며 되돌릴 수 없습니다.",
      confirmLabel: "삭제",
      tone: "danger",
    });
    if (!shouldDelete) {
      return;
    }

    setIsSavingGeneration(true);
    clearMessages();

    try {
      await adminResourceApi.deleteGeneration(selectedGeneration.id);
      setGenerations((previous) =>
        previous.filter((generation) => generation.id !== selectedGeneration.id),
      );
      setRequestedGenerationId(null);
      setEditDraft(null);
      setSuccessMessage("선택한 기수를 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const applyGenerationAssignment = async (input: {
    targets: GenerationAssignmentTarget[];
    successMessage: (updatedCount: number) => string;
    setPending: (isPending: boolean) => void;
  }) => {
    input.setPending(true);
    clearMessages();

    try {
      const updatedUsers = await Promise.all(
        input.targets.map((target) =>
          adminResourceApi.updateUser(target.userId, {
            generationIds: target.generationIds,
          }),
        ),
      );

      setUsers((previous) => mergeUpdatedUsers(previous, updatedUsers));
      setSelectedUserIds([]);
      setSuccessMessage(input.successMessage(updatedUsers.length));
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      input.setPending(false);
    }
  };

  const requireAssignmentPreconditions = (): boolean => {
    if (!selectedGeneration) {
      setErrorMessage("먼저 기수를 선택해 주세요.");
      setSuccessMessage(null);
      return false;
    }

    if (selectedUserIds.length === 0) {
      setErrorMessage("기수에 추가할 사용자를 선택해 주세요.");
      setSuccessMessage(null);
      return false;
    }

    return true;
  };

  const handleAssignUsersToGeneration = async () => {
    if (!requireAssignmentPreconditions() || !selectedGeneration) {
      return;
    }

    const targets = buildGenerationAssignTargets({
      users,
      selectedUserIds,
      generationId: selectedGeneration.id,
    });

    if (targets.length === 0) {
      setErrorMessage(null);
      setSuccessMessage("선택한 사용자는 이미 해당 기수에 포함되어 있습니다.");
      return;
    }

    await applyGenerationAssignment({
      targets,
      setPending: setIsAssigningUsers,
      successMessage: (updatedCount) =>
        `${updatedCount}명의 사용자를 ${selectedGeneration.name}에 추가했습니다.`,
    });
  };

  const handleRemoveUsersFromGeneration = async () => {
    if (!selectedGeneration) {
      setErrorMessage("먼저 기수를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (selectedUserIds.length === 0) {
      setErrorMessage("기수에서 제거할 사용자를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const targets = buildGenerationRemoveTargets({
      users,
      selectedUserIds,
      generationId: selectedGeneration.id,
    });

    if (targets.length === 0) {
      setErrorMessage(null);
      setSuccessMessage("선택한 사용자 중 해당 기수에 포함된 사용자가 없습니다.");
      return;
    }

    const shouldRemove = await confirm({
      title: `${targets.length}명의 사용자를 ${selectedGeneration.name}에서 제거하시겠습니까?`,
      description: "사용자 계정은 유지되고 기수 배정만 해제됩니다.",
      confirmLabel: "제거",
      tone: "danger",
    });
    if (!shouldRemove) {
      return;
    }

    await applyGenerationAssignment({
      targets,
      setPending: setIsRemovingUsers,
      successMessage: (updatedCount) =>
        `${updatedCount}명의 사용자를 ${selectedGeneration.name}에서 제거했습니다.`,
    });
  };

  return {
    generations,
    selectedGeneration,
    selectedGenerationId,
    setSelectedGenerationId: setRequestedGenerationId,

    createValues,
    setCreateValues: (patch: Partial<GenerationFormValues>) =>
      setCreateValues((previous) => ({ ...previous, ...patch })),

    editValues,
    setEditValues,

    nameQuery,
    setNameQuery,
    roleFilter,
    setRoleFilter: setRequestedRoleFilter,
    roleFilterOptions,
    filteredUsers,
    selectedUserIds,
    selectedUserIdSet,

    isSavingGeneration,
    isAssigningUsers,
    isRemovingUsers,
    errorMessage,
    successMessage,

    handleCreateGeneration,
    handleUpdateGeneration,
    handleDeleteGeneration,
    handleToggleUser: (userId: string) =>
      setSelectedUserIds((previous) => toggleSelectedUserId(previous, userId)),
    handleSelectVisibleUsers: () =>
      setSelectedUserIds((previous) =>
        addVisibleUserIds(
          previous,
          filteredUsers.map((user) => user.id),
        ),
      ),
    handleClearSelectedUsers: () => setSelectedUserIds([]),
    handleAssignUsersToGeneration,
    handleRemoveUsersFromGeneration,
  };
};

export type GenerationManagementState = ReturnType<typeof useGenerationManagement>;
