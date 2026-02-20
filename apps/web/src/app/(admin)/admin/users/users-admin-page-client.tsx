"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import type {
  ApiAdminUpdateUserInput,
  ApiGeneration,
  ApiUser,
} from "../../../../lib/admin-api/types";
import { formatKoreanName } from "../../../../lib/user-name";
import {
  ADMIN_USER_ROLE_OPTIONS,
  formatTimestamp,
  readErrorMessage,
} from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminDrawer from "../components/admin-drawer";
import {
  type AdminEntityRouteMode,
  buildAdminEntityRoute,
} from "../components/admin-entity-route";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import ImageInput from "../components/image-input";
import { useImmediateImageUpload } from "../components/use-immediate-image-upload";

type UserFormState = {
  name: string;
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
  role: string;
  generationIds: string[];
};

const emptyForm: UserFormState = {
  name: "",
  familyName: "",
  givenName: "",
  college: "",
  department: "",
  studentNumber: "",
  phoneNumber: "",
  role: "unverified",
  generationIds: [],
};

const isAllowedAdminRole = (
  role: string,
): role is NonNullable<ApiAdminUpdateUserInput["role"]> =>
  (ADMIN_USER_ROLE_OPTIONS as readonly string[]).includes(role);

const ADMIN_ROLE_LABELS: Record<string, string> = {
  president: "회장",
  vice_president: "부회장",
  manager: "운영진",
  new_member: "신입 회원",
  associate_member: "준회원",
  regular_member: "정회원",
  unverified: "미인증",
};

const readAdminRoleLabel = (role: string | null | undefined): string => {
  if (!role) {
    return "미지정";
  }
  return ADMIN_ROLE_LABELS[role] ?? role;
};

type RoleFilterValue =
  | "all"
  | "unset"
  | (typeof ADMIN_USER_ROLE_OPTIONS)[number];

const ROLE_FILTER_OPTIONS: { value: RoleFilterValue; label: string }[] = [
  { value: "all", label: "전체 권한" },
  ...ADMIN_USER_ROLE_OPTIONS.map((role) => ({
    value: role,
    label: readAdminRoleLabel(role),
  })),
  { value: "unset", label: "미지정" },
];

type UsersAdminPageClientProps = {
  generationScoped?: boolean;
  generationSortOrder?: number | null;
  basePath?: string;
  routeId?: string | null;
  routeMode?: AdminEntityRouteMode;
  initialData?: {
    users: ApiUser[];
    generations: ApiGeneration[];
  };
};

const toSelectionSet = (ids: string[]): Set<string> => new Set(ids);

type ResolvedUsersData = {
  scopedGeneration: ApiGeneration | null;
  visibleGenerations: ApiGeneration[];
  visibleUsers: ApiUser[];
};

const readUserGenerationIds = (target: ApiUser): string[] => {
  const generationIds = Array.isArray(target.generationIds)
    ? target.generationIds.filter(
        (generationId): generationId is string =>
          typeof generationId === "string" && generationId.length > 0,
      )
    : [];
  if (generationIds.length > 0) {
    return generationIds;
  }
  return target.generationId ? [target.generationId] : [];
};

const resolveUsersData = (
  users: ApiUser[],
  generationList: ApiGeneration[],
  generationScoped: boolean,
  generationSortOrder: number | null,
): ResolvedUsersData => {
  const scopedGeneration = generationScoped
    ? (generationList.find(
        (generation) => generation.sortOrder === generationSortOrder,
      ) ?? null)
    : null;

  const visibleGenerations = generationScoped
    ? scopedGeneration
      ? [scopedGeneration]
      : []
    : generationList;

  const visibleUsers =
    generationScoped && scopedGeneration
      ? users.filter((user) =>
          readUserGenerationIds(user).includes(scopedGeneration.id),
        )
      : generationScoped
        ? []
        : users;

  return {
    scopedGeneration,
    visibleGenerations,
    visibleUsers,
  };
};

export default function UsersAdminPageClient({
  generationScoped = false,
  generationSortOrder = null,
  basePath = "/admin/users",
  routeId = null,
  routeMode = "list",
  initialData,
}: UsersAdminPageClientProps = {}) {
  const router = useRouter();
  const inlineDetailMode = false;
  const initialResolvedData = initialData
    ? resolveUsersData(
        initialData.users,
        initialData.generations,
        generationScoped,
        generationSortOrder,
      )
    : null;

  const [items, setItems] = useState<ApiUser[]>(
    initialResolvedData?.visibleUsers ?? [],
  );
  const [generations, setGenerations] = useState<ApiGeneration[]>(
    initialResolvedData?.visibleGenerations ?? [],
  );
  const [scopedGeneration, setScopedGeneration] =
    useState<ApiGeneration | null>(
      initialResolvedData?.scopedGeneration ?? null,
    );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiUser | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [generationFilter, setGenerationFilter] = useState<string>("all");
  const [bulkRole, setBulkRole] = useState<string>("regular_member");
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm);
  const imageUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.userProfile,
  });

  const [isLoading, setIsLoading] = useState(() => !initialData);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "delete" | "bulk-role" | "bulk-delete" | null
  >(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const detailRequestSequenceRef = useRef(0);
  const isDetailRoute = routeMode === "detail";
  const isStandaloneRoute = routeMode === "detail" || routeMode === "edit";

  const scopedGenerationId = generationScoped
    ? (scopedGeneration?.id ?? null)
    : null;
  const selectedIdSet = useMemo(
    () => toSelectionSet(selectedIds),
    [selectedIds],
  );
  const selectedUsers = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );
  const generationLabelById = useMemo(() => {
    return new Map(
      generations.map((generation) => [
        generation.id,
        `${generation.sortOrder}기 (${generation.name})`,
      ]),
    );
  }, [generations]);

  const readGenerationSummary = (target: ApiUser): string => {
    const generationIds = readUserGenerationIds(target);
    if (generationIds.length === 0) {
      return "없음";
    }
    return generationIds
      .map(
        (generationId) =>
          generationLabelById.get(generationId) ?? "미확인 기수",
      )
      .join(", ");
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);

    return sorted.filter((item) => {
      if (roleFilter !== "all") {
        if (roleFilter === "unset") {
          if (item.role !== null) {
            return false;
          }
        } else if (item.role !== roleFilter) {
          return false;
        }
      }

      const targetGenerationFilter =
        scopedGenerationId ??
        (generationFilter === "all"
          ? null
          : generationFilter === "unassigned"
            ? "unassigned"
            : generationFilter);
      const itemGenerationIds = readUserGenerationIds(item);
      if (targetGenerationFilter) {
        if (targetGenerationFilter === "unassigned") {
          if (itemGenerationIds.length > 0) {
            return false;
          }
        } else if (!itemGenerationIds.includes(targetGenerationFilter)) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const displayName = formatKoreanName(item).toLowerCase();
      return (
        displayName.includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.familyName ?? "").toLowerCase().includes(query) ||
        (item.givenName ?? "").toLowerCase().includes(query) ||
        (item.college ?? "").toLowerCase().includes(query) ||
        (item.department ?? "").toLowerCase().includes(query) ||
        (item.studentNumber ?? "").toLowerCase().includes(query) ||
        (item.phoneNumber ?? "").toLowerCase().includes(query)
      );
    });
  }, [generationFilter, items, roleFilter, scopedGenerationId, searchQuery]);

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIdSet.has(item.id));

  const syncForm = (user: ApiUser | null) => {
    if (!user) {
      setEditForm(emptyForm);
      imageUpload.reset(null);
      return;
    }

    setEditForm({
      name: user.name,
      familyName: user.familyName ?? "",
      givenName: user.givenName ?? "",
      college: user.college ?? "",
      department: user.department ?? "",
      studentNumber: user.studentNumber ?? "",
      phoneNumber: user.phoneNumber ?? "",
      role: user.role ?? "unverified",
      generationIds: readUserGenerationIds(user),
    });
    imageUpload.reset(user.image ?? "");
  };

  const clearSelectedDetail = () => {
    detailRequestSequenceRef.current += 1;
    setIsDetailLoading(false);
    setSelectedDetail(null);
    syncForm(null);
  };

  const loadUserDetail = async (userId: string): Promise<ApiUser | null> => {
    const requestSequence = detailRequestSequenceRef.current + 1;
    detailRequestSequenceRef.current = requestSequence;
    setIsDetailLoading(true);

    try {
      const detail = await adminResourceApi.getUserById(userId);
      if (detailRequestSequenceRef.current !== requestSequence) {
        return null;
      }
      setSelectedDetail(detail);
      syncForm(detail);
      return detail;
    } catch (error) {
      if (detailRequestSequenceRef.current !== requestSequence) {
        return null;
      }
      setSelectedDetail(null);
      syncForm(null);
      setErrorMessage(readErrorMessage(error));
      return null;
    } finally {
      if (detailRequestSequenceRef.current === requestSequence) {
        setIsDetailLoading(false);
      }
    }
  };

  const applyLoadedData = async (
    users: ApiUser[],
    generationList: ApiGeneration[],
    preferredSelectedId?: string | null,
  ) => {
    const { scopedGeneration, visibleGenerations, visibleUsers } =
      resolveUsersData(
        users,
        generationList,
        generationScoped,
        generationSortOrder,
      );

    setScopedGeneration(scopedGeneration);
    setItems(visibleUsers);
    setGenerations(visibleGenerations);
    setSelectedIds((previous) =>
      previous.filter((id) => visibleUsers.some((user) => user.id === id)),
    );

    if (generationScoped && !scopedGeneration) {
      setSelectedId(null);
      setExpandedUserId(null);
      clearSelectedDetail();
      setErrorMessage("선택한 기수를 찾을 수 없습니다.");
      setPanelOpen(false);
      return;
    }

    if (visibleUsers.length === 0) {
      setSelectedId(null);
      setExpandedUserId(null);
      clearSelectedDetail();
      setPanelOpen(false);
      return;
    }

    const fallbackId = visibleUsers[0]?.id ?? null;
    const candidateSelectedId =
      preferredSelectedId ??
      (selectedId && visibleUsers.some((user) => user.id === selectedId)
        ? selectedId
        : null) ??
      fallbackId;
    setSelectedId(candidateSelectedId);

    if (!candidateSelectedId) {
      setExpandedUserId(null);
      clearSelectedDetail();
      return;
    }

    if (inlineDetailMode) {
      const targetExpandedId =
        preferredSelectedId ??
        (expandedUserId &&
        visibleUsers.some((user) => user.id === expandedUserId)
          ? expandedUserId
          : null);
      if (!targetExpandedId) {
        setExpandedUserId(null);
        clearSelectedDetail();
        return;
      }
      setExpandedUserId(targetExpandedId);
      setSelectedId(targetExpandedId);
      await loadUserDetail(targetExpandedId);
      return;
    }

    await loadUserDetail(candidateSelectedId);
  };

  const loadData = async (preferredSelectedId?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [users, generationList] = await Promise.all([
        adminResourceApi.listUsers(),
        adminResourceApi.listGenerations(),
      ]);

      await applyLoadedData(users, generationList, preferredSelectedId);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      setIsLoading(true);
      setErrorMessage(null);

      void applyLoadedData(initialData.users, initialData.generations).finally(
        () => {
          setIsLoading(false);
        },
      );
      return;
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationScoped, generationSortOrder, initialData]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (routeMode === "detail" || routeMode === "edit") {
      const target = items.find((user) => user.id === routeId) ?? null;
      if (!target) {
        router.replace(buildAdminEntityRoute(basePath, "list"), {
          scroll: false,
        });
        return;
      }

      if (selectedId !== target.id || !panelOpen) {
        void handleSelect(target, false);
      }
      return;
    }

    if (panelOpen) {
      setPanelOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routeMode,
    routeId,
    isLoading,
    items,
    selectedId,
    panelOpen,
    router,
    basePath,
  ]);

  const toggleSelection = (userId: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return Array.from(next);
    });
  };

  const handleToggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const user of filteredItems) {
        if (checked) {
          next.add(user.id);
        } else {
          next.delete(user.id);
        }
      }
      return Array.from(next);
    });
  };

  const handleToggleGenerationSelection = (
    generationId: string,
    checked: boolean,
  ) => {
    setEditForm((previous) => {
      const next = new Set(previous.generationIds);
      if (checked) {
        next.add(generationId);
      } else {
        next.delete(generationId);
      }
      return {
        ...previous,
        generationIds: Array.from(next),
      };
    });
  };

  const handleSelect = async (user: ApiUser, navigate = true) => {
    setSelectedId(user.id);
    setPanelOpen(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (navigate) {
      router.push(buildAdminEntityRoute(basePath, "detail", user.id), {
        scroll: false,
      });
    }
    await loadUserDetail(user.id);
  };

  const handleNavigateBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(buildAdminEntityRoute(basePath, "list"), { scroll: false });
  };

  const handleCardSelect = (user: ApiUser) => {
    setSelectedId(user.id);
    toggleSelection(user.id);
  };

  const handleToggleInlineDetail = async (user: ApiUser) => {
    if (!inlineDetailMode) {
      await handleSelect(user);
      return;
    }

    if (expandedUserId === user.id) {
      setExpandedUserId(null);
      clearSelectedDetail();
      return;
    }

    setExpandedUserId(user.id);
    setSelectedId(user.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    await loadUserDetail(user.id);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDetail) {
      return;
    }
    if (imageUpload.isUploading || imageUpload.hasUploadError) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const generationIdsForPayload = scopedGenerationId
        ? Array.from(
            new Set([
              ...readUserGenerationIds(selectedDetail),
              scopedGenerationId,
            ]),
          )
        : editForm.generationIds;

      const payload: ApiAdminUpdateUserInput = {
        name: editForm.name.trim(),
        familyName: editForm.familyName.trim() || null,
        givenName: editForm.givenName.trim() || null,
        college: editForm.college.trim() || null,
        department: editForm.department.trim() || null,
        studentNumber: editForm.studentNumber.trim() || null,
        phoneNumber: editForm.phoneNumber.trim() || null,
        image: imageUpload.currentUrl.trim() || null,
        role: isAllowedAdminRole(editForm.role) ? editForm.role : "unverified",
        generationIds: generationIdsForPayload,
      };

      await adminResourceApi.updateUser(selectedDetail.id, payload);
      setSuccessMessage("사용자 정보를 수정했습니다.");
      await loadData(selectedDetail.id);
      if (routeMode === "edit") {
        router.replace(
          buildAdminEntityRoute(basePath, "detail", selectedDetail.id),
          {
            scroll: false,
          },
        );
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDetail) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("delete");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteUser(selectedDetail.id);
      setSuccessMessage("사용자를 삭제했습니다.");
      setDeleteModalOpen(false);
      setExpandedUserId(null);
      setPanelOpen(false);
      setSelectedIds((previous) =>
        previous.filter((id) => id !== selectedDetail.id),
      );
      await loadData();
      router.replace(buildAdminEntityRoute(basePath, "list"), {
        scroll: false,
      });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleBulkRoleUpdate = async () => {
    if (selectedIds.length === 0 || !isAllowedAdminRole(bulkRole)) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("bulk-role");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const targetIds = [...selectedIds];
      const updatedUsers = await adminResourceApi.bulkUpdateUsersRole({
        userIds: targetIds,
        role: bulkRole,
      });
      setSuccessMessage(
        `${updatedUsers.length}명의 권한을 ${readAdminRoleLabel(bulkRole)}로 변경했습니다.`,
      );
      await loadData(selectedDetail?.id ?? null);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("bulk-delete");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const targetIds = [...selectedIds];
      const results = await Promise.allSettled(
        targetIds.map((id) => adminResourceApi.deleteUser(id)),
      );
      const successCount = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failureCount = results.length - successCount;

      setBulkDeleteModalOpen(false);
      setSelectedIds([]);
      if (successCount > 0) {
        setSuccessMessage(`${successCount}명의 사용자를 삭제했습니다.`);
      }
      if (failureCount > 0) {
        setErrorMessage(`${failureCount}명의 사용자 삭제에 실패했습니다.`);
      }

      if (selectedDetail && targetIds.includes(selectedDetail.id)) {
        setExpandedUserId(null);
        setPanelOpen(false);
      }
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const renderUserEditor = () => (
    <>
      <div
        className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
        data-testid="user-detail-card"
      >
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          선택 사용자 상세 정보
        </h3>
        {isDetailLoading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : selectedDetail ? (
          <div className="space-y-1 text-sm text-gray-700">
            <p>사용자 ID: {selectedDetail.id}</p>
            <p>표시 이름: {formatKoreanName(selectedDetail)}</p>
            <p>이메일: {selectedDetail.email}</p>
            <p>권한: {readAdminRoleLabel(selectedDetail.role)}</p>
            <p>
              성/이름: {selectedDetail.familyName ?? "-"}/
              {selectedDetail.givenName ?? "-"}
            </p>
            <p>
              대학/학과: {selectedDetail.college ?? "-"}/
              {selectedDetail.department ?? "-"}
            </p>
            <p>학번: {selectedDetail.studentNumber ?? "-"}</p>
            <p>전화번호: {selectedDetail.phoneNumber ?? "-"}</p>
            <p>소속 기수: {readGenerationSummary(selectedDetail)}</p>
            <p>가입일: {formatTimestamp(selectedDetail.createdAt)}</p>
            <p>최근 수정일: {formatTimestamp(selectedDetail.updatedAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">사용자를 선택해 주세요.</p>
        )}
      </div>

      <form
        onSubmit={handleUpdate}
        className="space-y-3"
        data-testid="user-edit-form"
      >
        {selectedDetail ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block">레거시 이름</span>
              <input
                type="text"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="user-edit-name"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block">성</span>
                <input
                  type="text"
                  value={editForm.familyName}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      familyName: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-family-name"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">이름</span>
                <input
                  type="text"
                  value={editForm.givenName}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      givenName: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-given-name"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block">대학</span>
                <input
                  type="text"
                  value={editForm.college}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      college: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-college"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">학과</span>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      department: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-department"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block">학번 (10자리)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editForm.studentNumber}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      studentNumber: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-student-number"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">전화번호</span>
                <input
                  type="text"
                  value={editForm.phoneNumber}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      phoneNumber: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-phone-number"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block">권한</span>
              <select
                value={editForm.role}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    role: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="user-edit-role"
              >
                {ADMIN_USER_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {readAdminRoleLabel(role)}
                  </option>
                ))}
              </select>
            </label>

            {scopedGenerationId ? (
              <div
                className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                data-testid="user-scoped-generation-field"
              >
                현재 선택한 기수는 자동 포함됩니다. 다른 소속 기수는 유지됩니다.
              </div>
            ) : (
              <div className="block text-sm">
                <span className="mb-1 block">소속 기수 (복수 선택)</span>
                <div
                  className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-generation-id"
                >
                  {generations.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      등록된 기수가 없습니다.
                    </p>
                  ) : null}
                  {generations.map((generation) => (
                    <label
                      key={generation.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-gray-200 px-2 py-1.5"
                    >
                      <span className="text-sm text-gray-700">
                        {generation.sortOrder}기 ({generation.name})
                      </span>
                      <input
                        type="checkbox"
                        checked={editForm.generationIds.includes(generation.id)}
                        onChange={(event) =>
                          handleToggleGenerationSelection(
                            generation.id,
                            event.target.checked,
                          )
                        }
                        data-testid={`user-edit-generation-checkbox-${generation.id}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <ImageInput
              label="프로필 이미지"
              file={imageUpload.file}
              onFileChange={imageUpload.selectFile}
              currentUrl={imageUpload.currentUrl}
              status={imageUpload.status}
              errorMessage={imageUpload.errorMessage}
              onRetry={imageUpload.retry}
              uploadProgress={imageUpload.progress}
              isUploading={imageUpload.isUploading}
              previewShape="avatar"
              disabled={isSubmitting}
              testIdPrefix="user-edit-image"
            />

            <div className="mt-2 flex gap-2">
              <AdminActionButton
                type="submit"
                disabled={
                  isSubmitting ||
                  imageUpload.isUploading ||
                  imageUpload.hasUploadError
                }
                testId="user-edit-submit"
              >
                수정 저장
              </AdminActionButton>
              <AdminActionButton
                variant="danger"
                onClick={() => {
                  if (!isSubmitting) {
                    setDeleteModalOpen(true);
                  }
                }}
                loading={activeSubmitAction === "delete"}
                disabled={isSubmitting && activeSubmitAction !== "delete"}
                loadingText="사용자 삭제 중..."
                testId="user-delete-button"
              >
                사용자 삭제
              </AdminActionButton>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            수정할 사용자를 선택해 주세요.
          </p>
        )}
      </form>
    </>
  );

  return (
    <div className="space-y-6" data-testid="users-page">
      <AdminPageHeader
        title="사용자 관리"
        description="가입한 사용자 정보를 조회하고 권한/소속을 관리하는 화면입니다."
        guidance="사용자 카드를 클릭하면 선택만 됩니다. 카드 오른쪽의 수정 버튼으로 상세 페이지로 이동해 편집하세요. 검색/필터/다중 선택으로 일괄 작업할 수 있습니다."
      >
        {isStandaloneRoute ? (
          <div className="mt-3 flex items-center">
            <AdminActionButton
              variant="ghost"
              onClick={handleNavigateBack}
              testId="user-route-back"
            >
              ← 이전 페이지
            </AdminActionButton>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              data-testid="users-reload-button"
            >
              새로고침
            </button>
            {generationScoped ? (
              <p
                className="text-xs text-gray-500"
                data-testid="users-scoped-generation"
              >
                {scopedGeneration
                  ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
                  : "현재 기수를 확인하는 중..."}
              </p>
            ) : null}
          </div>
        )}
      </AdminPageHeader>

      {!isStandaloneRoute ? (
        <AdminInfoBox title="작업 안내">
          프로필 이미지는 파일 선택 즉시 업로드됩니다. 업로드가 끝난 뒤 저장하면
          사용자 정보에 반영됩니다.
        </AdminInfoBox>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="users-error"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700"
          data-testid="users-success"
        >
          {successMessage}
        </p>
      ) : null}

      {!isStandaloneRoute ? (
        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">사용자 목록</h2>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="이름/이메일/학번 검색"
              className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
              data-testid="user-search-input"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">권한 필터</span>
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as RoleFilterValue)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                data-testid="user-role-filter"
              >
                {ROLE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {scopedGenerationId ? (
              <div
                className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                data-testid="user-generation-filter-scoped"
              >
                기수 필터는 현재 선택 기수로 고정됩니다.
              </div>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block text-gray-600">기수 필터</span>
                <select
                  value={generationFilter}
                  onChange={(event) => setGenerationFilter(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-generation-filter"
                >
                  <option value="all">전체 기수</option>
                  <option value="unassigned">미배정</option>
                  {generations.map((generation) => (
                    <option key={generation.id} value={generation.id}>
                      {generation.sortOrder}기 ({generation.name})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p data-testid="user-selected-count">
                선택된 사용자: {selectedIds.length}명
              </p>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllVisible(true)}
                  disabled={allVisibleSelected || filteredItems.length === 0}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="user-select-all-visible"
                >
                  현재 목록 전체 선택
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSelectAllVisible(false)}
                  disabled={selectedIds.length === 0}
                  className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="user-clear-selection"
                >
                  전체 선택 해제
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkRole}
                onChange={(event) => setBulkRole(event.target.value)}
                className="min-w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
                data-testid="user-bulk-role"
              >
                {ADMIN_USER_ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {readAdminRoleLabel(role)}
                  </option>
                ))}
              </select>
              <AdminActionButton
                onClick={() => void handleBulkRoleUpdate()}
                loading={activeSubmitAction === "bulk-role"}
                disabled={
                  isSubmitting ||
                  selectedIds.length === 0 ||
                  !isAllowedAdminRole(bulkRole)
                }
                loadingText="일괄 권한 변경 중..."
                testId="user-bulk-role-submit"
              >
                선택 사용자 권한 변경
              </AdminActionButton>
              <AdminActionButton
                variant="danger"
                onClick={() => {
                  if (!isSubmitting && selectedIds.length > 0) {
                    setBulkDeleteModalOpen(true);
                  }
                }}
                disabled={isSubmitting || selectedIds.length === 0}
                testId="user-bulk-delete-button"
              >
                선택 사용자 삭제
              </AdminActionButton>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              {items.length === 0
                ? "표시할 사용자가 없습니다."
                : "검색/필터 조건에 맞는 사용자가 없습니다."}
            </p>
          ) : (
            <ul
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="users-list"
            >
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-md border p-3 ${
                    selectedIdSet.has(item.id)
                      ? "border-[var(--admin-accent-strong)] bg-[var(--admin-surface-subtle)]"
                      : "border-gray-200"
                  } cursor-pointer`}
                  data-testid={`user-row-${item.id}`}
                  onClick={() => void handleCardSelect(item)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="min-w-0 flex-1 text-left"
                      data-testid={`user-select-${item.id}`}
                    >
                      <p className="font-medium">
                        {formatKoreanName(item)}
                        {selectedIdSet.has(item.id) ? (
                          <span className="ml-2 text-xs font-normal text-[var(--admin-accent)]">
                            선택됨
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                      <p className="text-xs text-gray-500">
                        권한: {readAdminRoleLabel(item.role)}
                      </p>
                    </div>
                    {inlineDetailMode ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleInlineDetail(item);
                        }}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        data-testid={`user-inline-toggle-${item.id}`}
                      >
                        {expandedUserId === item.id ? "상세 닫기" : "상세 보기"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSelect(item);
                        }}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100"
                        data-testid={`user-open-detail-${item.id}`}
                      >
                        수정
                      </button>
                    )}
                  </div>
                  {inlineDetailMode && expandedUserId === item.id ? (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
                      {renderUserEditor()}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <AdminDrawer
        open={panelOpen}
        title={isDetailRoute ? "사용자 상세" : "사용자 수정"}
        description={
          selectedDetail
            ? isDetailRoute
              ? `${selectedDetail.email} 계정 상세 정보입니다.`
              : `${selectedDetail.email} 계정을 편집합니다.`
            : "사용자 상세 정보를 불러오는 중입니다."
        }
        onClose={() => {
          if (!isSubmitting) {
            setPanelOpen(false);
            router.push(buildAdminEntityRoute(basePath, "list"), {
              scroll: false,
            });
          }
        }}
        testId="user-drawer"
        variant="page"
        showCloseButton={!isStandaloneRoute}
      >
        {isDetailRoute ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedDetail ? (
                <AdminActionButton
                  onClick={() =>
                    router.push(
                      buildAdminEntityRoute(
                        basePath,
                        "edit",
                        selectedDetail.id,
                      ),
                      {
                        scroll: false,
                      },
                    )
                  }
                  testId="user-open-edit"
                >
                  수정 페이지로 이동
                </AdminActionButton>
              ) : null}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div data-testid="user-detail-card">
              {isDetailLoading ? (
                <p className="text-sm text-gray-500">불러오는 중...</p>
              ) : selectedDetail ? (
                <div className="space-y-1 text-sm text-gray-700">
                  <p>표시 이름: {formatKoreanName(selectedDetail)}</p>
                  <p>이메일: {selectedDetail.email}</p>
                  <p>권한: {readAdminRoleLabel(selectedDetail.role)}</p>
                  <p>소속 기수: {readGenerationSummary(selectedDetail)}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  사용자 정보를 찾을 수 없습니다.
                </p>
              )}
              </div>
            </div>
          </div>
        ) : (
          renderUserEditor()
        )}
      </AdminDrawer>

      <AdminConfirmModal
        open={deleteModalOpen}
        title="사용자를 삭제할까요?"
        description={
          selectedDetail
            ? `"${selectedDetail.email}" 계정을 삭제하면 복구할 수 없습니다.`
            : "선택한 사용자 계정을 삭제합니다."
        }
        confirmText="삭제하기"
        confirmLoadingText="삭제 중..."
        isLoading={activeSubmitAction === "delete"}
        onConfirm={() => void handleDelete()}
        onClose={() => {
          if (!isSubmitting) {
            setDeleteModalOpen(false);
          }
        }}
      />

      <AdminConfirmModal
        open={bulkDeleteModalOpen}
        title="선택한 사용자를 삭제할까요?"
        description={`선택된 ${selectedUsers.length}명의 계정을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="일괄 삭제"
        confirmLoadingText="삭제 중..."
        isLoading={activeSubmitAction === "bulk-delete"}
        onConfirm={() => void handleBulkDelete()}
        onClose={() => {
          if (!isSubmitting) {
            setBulkDeleteModalOpen(false);
          }
        }}
      />
    </div>
  );
}
