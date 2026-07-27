"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApiGeneration, ApiUser } from "@/shared/contracts/api-contracts";
import { AdminApiError } from "@/shared/http/http";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { useConfirm } from "@/app/(dashboard)/_components/ui/confirm-provider";
import {
  USER_ROLE_FILTER_ALL,
  USER_ROLE_FILTER_NONE,
  filterAssignableUsers,
  formatTimestampToDateInput,
  mergeGenerationId,
  readNormalizedGenerationIds,
  removeGenerationId,
  sortGenerationsBySortOrderDesc,
  validateGenerationFormInput,
} from "@/app/(dashboard)/dashboard/settings/generations/generation-management-shared";
import { buildMemberRoleLabel } from "@/features/dashboard/members/member-role-label";

const ROLE_FILTER_ORDER = [
  "president",
  "vice_president",
  "manager",
  "new_member",
  "associate_member",
  "regular_member",
  USER_ROLE_FILTER_NONE,
] as const;

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
};

/**
 * 기수 관리 화면의 상태와 서버 호출을 전부 담당한다.
 *
 * 화면이 "기수 목록/생성/수정" 패널과 "멤버 배정" 패널로 나뉘는데 두 패널이
 * 같은 목록(generations, users)과 같은 저장 중 플래그를 공유한다. 그래서 상태를
 * 패널별로 쪼개지 않고 여기에 모아 두고, 패널은 표시만 하게 했다.
 */
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

export const useGenerationManagement = () => {
  const router = useRouter();
  const confirm = useConfirm();

  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createSortOrderInput, setCreateSortOrderInput] = useState("");
  const [createStartDateInput, setCreateStartDateInput] = useState("");
  const [createEndDateInput, setCreateEndDateInput] = useState("");

  const [editName, setEditName] = useState("");
  const [editSortOrderInput, setEditSortOrderInput] = useState("");
  const [editStartDateInput, setEditStartDateInput] = useState("");
  const [editEndDateInput, setEditEndDateInput] = useState("");

  const [nameQuery, setNameQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(USER_ROLE_FILTER_ALL);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGeneration, setIsSavingGeneration] = useState(false);
  const [isAssigningUsers, setIsAssigningUsers] = useState(false);
  const [isRemovingUsers, setIsRemovingUsers] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [generationRows, userRows] = await Promise.all([
          adminResourceApi.listGenerations(),
          adminResourceApi.listUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        const sortedGenerations = sortGenerationsBySortOrderDesc(generationRows);
        setGenerations(sortedGenerations);
        setUsers(userRows);
        setSelectedGenerationId((previous) => {
          if (
            previous &&
            sortedGenerations.some((generation) => generation.id === previous)
          ) {
            return previous;
          }

          return sortedGenerations[0]?.id ?? null;
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setGenerations([]);
        setUsers([]);
        setSelectedGenerationId(null);
        setErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedGeneration = useMemo(
    () =>
      selectedGenerationId
        ? (generations.find((generation) => generation.id === selectedGenerationId) ??
          null)
        : null,
    [generations, selectedGenerationId],
  );

  useEffect(() => {
    if (!selectedGeneration) {
      setEditName("");
      setEditSortOrderInput("");
      setEditStartDateInput("");
      setEditEndDateInput("");
      return;
    }

    setEditName(selectedGeneration.name);
    setEditSortOrderInput(String(selectedGeneration.sortOrder));
    setEditStartDateInput(formatTimestampToDateInput(selectedGeneration.startDate));
    setEditEndDateInput(formatTimestampToDateInput(selectedGeneration.endDate));
  }, [selectedGeneration]);

  const roleFilterOptions = useMemo(() => {
    const roleSet = new Set<string>();
    for (const user of users) {
      if (user.role === "unverified") {
        continue;
      }

      if (user.role) {
        roleSet.add(user.role);
      } else {
        roleSet.add(USER_ROLE_FILTER_NONE);
      }
    }

    const orderedRoles = ROLE_FILTER_ORDER.filter((role) => roleSet.has(role));
    const customRoles = [...roleSet]
      .filter(
        (role) => !ROLE_FILTER_ORDER.includes(role as (typeof ROLE_FILTER_ORDER)[number]),
      )
      .sort((left, right) => left.localeCompare(right, "ko"));

    return [USER_ROLE_FILTER_ALL, ...orderedRoles, ...customRoles];
  }, [users]);

  useEffect(() => {
    if (!roleFilterOptions.includes(roleFilter)) {
      setRoleFilter(USER_ROLE_FILTER_ALL);
    }
  }, [roleFilter, roleFilterOptions]);

  const filteredUsers = useMemo(
    () =>
      filterAssignableUsers({
        users,
        nameQuery,
        roleFilter,
      }),
    [nameQuery, roleFilter, users],
  );

  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const handleCreateGeneration = async () => {
    const validationResult = validateGenerationFormInput({
      name: createName,
      sortOrderInput: createSortOrderInput,
      startDateInput: createStartDateInput,
      endDateInput: createEndDateInput,
    });
    if ("errorMessage" in validationResult) {
      setErrorMessage(validationResult.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingGeneration(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminResourceApi.createGeneration(validationResult.payload);
      setGenerations((previous) =>
        sortGenerationsBySortOrderDesc([...previous, created]),
      );
      setSelectedGenerationId(created.id);
      setCreateName("");
      setCreateSortOrderInput("");
      setCreateStartDateInput("");
      setCreateEndDateInput("");
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
      name: editName,
      sortOrderInput: editSortOrderInput,
      startDateInput: editStartDateInput,
      endDateInput: editEndDateInput,
    });
    if ("errorMessage" in validationResult) {
      setErrorMessage(validationResult.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSavingGeneration(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteGeneration(selectedGeneration.id);
      const nextGenerations = generations.filter(
        (generation) => generation.id !== selectedGeneration.id,
      );
      setGenerations(nextGenerations);
      if (selectedGenerationId === selectedGeneration.id) {
        setSelectedGenerationId(nextGenerations[0]?.id ?? null);
      }
      setSuccessMessage("선택한 기수를 삭제했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSavingGeneration(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((previous) => {
      if (previous.includes(userId)) {
        return previous.filter((id) => id !== userId);
      }

      return [...previous, userId];
    });
  };

  const handleSelectVisibleUsers = () => {
    setSelectedUserIds((previous) => {
      const next = new Set(previous);
      for (const user of filteredUsers) {
        next.add(user.id);
      }
      return [...next];
    });
  };

  const handleClearSelectedUsers = () => {
    setSelectedUserIds([]);
  };

  const handleAssignUsersToGeneration = async () => {
    if (!selectedGeneration) {
      setErrorMessage("먼저 기수를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (selectedUserIds.length === 0) {
      setErrorMessage("기수에 추가할 사용자를 선택해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const targetUsers = users.filter((user) => selectedUserIdSet.has(user.id));
    const updateTargets = targetUsers
      .map((user) => {
        const currentGenerationIds = readNormalizedGenerationIds(user);
        const nextGenerationIds = mergeGenerationId(
          currentGenerationIds,
          selectedGeneration.id,
        );
        if (currentGenerationIds.length === nextGenerationIds.length) {
          return null;
        }

        return {
          userId: user.id,
          generationIds: nextGenerationIds,
        };
      })
      .filter(
        (item): item is { userId: string; generationIds: string[] } => item !== null,
      );

    if (updateTargets.length === 0) {
      setErrorMessage(null);
      setSuccessMessage("선택한 사용자는 이미 해당 기수에 포함되어 있습니다.");
      return;
    }

    setIsAssigningUsers(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedUsers = await Promise.all(
        updateTargets.map((target) =>
          adminResourceApi.updateUser(target.userId, {
            generationIds: target.generationIds,
          }),
        ),
      );
      const updatedUserById = new Map(updatedUsers.map((user) => [user.id, user]));

      setUsers((previous) =>
        previous.map((user) => updatedUserById.get(user.id) ?? user),
      );
      setSelectedUserIds([]);
      setSuccessMessage(
        `${updatedUsers.length}명의 사용자를 ${selectedGeneration.name}에 추가했습니다.`,
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsAssigningUsers(false);
    }
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

    const targetUsers = users.filter((user) => selectedUserIdSet.has(user.id));
    const removeTargets = targetUsers
      .map((user) => {
        const currentGenerationIds = readNormalizedGenerationIds(user);
        if (!currentGenerationIds.includes(selectedGeneration.id)) {
          return null;
        }

        const nextGenerationIds = removeGenerationId(
          currentGenerationIds,
          selectedGeneration.id,
        );

        return {
          userId: user.id,
          generationIds: nextGenerationIds,
        };
      })
      .filter(
        (item): item is { userId: string; generationIds: string[] } => item !== null,
      );

    if (removeTargets.length === 0) {
      setErrorMessage(null);
      setSuccessMessage("선택한 사용자 중 해당 기수에 포함된 사용자가 없습니다.");
      return;
    }

    const shouldRemove = await confirm({
      title: `${removeTargets.length}명의 사용자를 ${selectedGeneration.name}에서 제거하시겠습니까?`,
      description: "사용자 계정은 유지되고 기수 배정만 해제됩니다.",
      confirmLabel: "제거",
      tone: "danger",
    });
    if (!shouldRemove) {
      return;
    }

    setIsRemovingUsers(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedUsers = await Promise.all(
        removeTargets.map((target) =>
          adminResourceApi.updateUser(target.userId, {
            generationIds: target.generationIds,
          }),
        ),
      );
      const updatedUserById = new Map(updatedUsers.map((user) => [user.id, user]));

      setUsers((previous) =>
        previous.map((user) => updatedUserById.get(user.id) ?? user),
      );
      setSelectedUserIds([]);
      setSuccessMessage(
        `${updatedUsers.length}명의 사용자를 ${selectedGeneration.name}에서 제거했습니다.`,
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsRemovingUsers(false);
    }
  };

  return {
    generations,
    selectedGeneration,
    selectedGenerationId,
    setSelectedGenerationId,

    createName,
    setCreateName,
    createSortOrderInput,
    setCreateSortOrderInput,
    createStartDateInput,
    setCreateStartDateInput,
    createEndDateInput,
    setCreateEndDateInput,

    editName,
    setEditName,
    editSortOrderInput,
    setEditSortOrderInput,
    editStartDateInput,
    setEditStartDateInput,
    editEndDateInput,
    setEditEndDateInput,

    nameQuery,
    setNameQuery,
    roleFilter,
    setRoleFilter,
    roleFilterOptions,
    filteredUsers,
    selectedUserIds,
    selectedUserIdSet,

    isLoading,
    isSavingGeneration,
    isAssigningUsers,
    isRemovingUsers,
    errorMessage,
    successMessage,

    handleCreateGeneration,
    handleUpdateGeneration,
    handleDeleteGeneration,
    handleToggleUser,
    handleSelectVisibleUsers,
    handleClearSelectedUsers,
    handleAssignUsersToGeneration,
    handleRemoveUsersFromGeneration,
  };
};

export type GenerationManagementState = ReturnType<typeof useGenerationManagement>;
