"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import type { ApiAdminUpdateUserInput, ApiGeneration, ApiUser } from "../../../../lib/admin-api/types";
import { formatKoreanName } from "../../../../lib/user-name";
import {
  ADMIN_USER_ROLE_OPTIONS,
  formatTimestamp,
  readErrorMessage,
} from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminDrawer from "../components/admin-drawer";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import ImageInput from "../components/image-input";
import { useAdminDrawerQuerySync } from "../components/use-admin-drawer-query-sync";
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
  generationId: string;
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
  generationId: "",
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

type RoleFilterValue = "all" | "unset" | (typeof ADMIN_USER_ROLE_OPTIONS)[number];

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
};

const toSelectionSet = (ids: string[]): Set<string> => new Set(ids);

export default function UsersAdminPageClient({
  generationScoped = false,
  generationSortOrder = null,
}: UsersAdminPageClientProps = {}) {
  const inlineDetailMode = !generationScoped;
  const [items, setItems] = useState<ApiUser[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(null);
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
  const imageUpload = useImmediateImageUpload({ presignPath: PRESIGN_PATHS.userProfile });

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "delete" | "bulk-role" | "bulk-delete" | null
  >(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { queryState, setDrawerQuery, normalizeDrawerQuery } = useAdminDrawerQuerySync();
  const detailRequestSequenceRef = useRef(0);

  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;
  const selectedIdSet = useMemo(() => toSelectionSet(selectedIds), [selectedIds]);
  const selectedUsers = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet],
  );

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
        (generationFilter === "all" ? null : generationFilter === "unassigned" ? "unassigned" : generationFilter);
      if (targetGenerationFilter) {
        if (targetGenerationFilter === "unassigned") {
          if (item.generationId !== null) {
            return false;
          }
        } else if (item.generationId !== targetGenerationFilter) {
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
    filteredItems.length > 0 && filteredItems.every((item) => selectedIdSet.has(item.id));

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
      generationId: user.generationId ?? "",
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

  const loadData = async (preferredSelectedId?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [users, generationList] = await Promise.all([
        adminResourceApi.listUsers(),
        adminResourceApi.listGenerations(),
      ]);

      const nextScopedGeneration = generationScoped
        ? generationList.find((generation) => generation.sortOrder === generationSortOrder) ?? null
        : null;

      const visibleGenerations = generationScoped
        ? nextScopedGeneration
          ? [nextScopedGeneration]
          : []
        : generationList;

      const visibleUsers =
        generationScoped && nextScopedGeneration
          ? users.filter((user) => user.generationId === nextScopedGeneration.id)
          : generationScoped
            ? []
            : users;

      setScopedGeneration(nextScopedGeneration);
      setItems(visibleUsers);
      setGenerations(visibleGenerations);
      setSelectedIds((previous) =>
        previous.filter((id) => visibleUsers.some((user) => user.id === id)),
      );

      if (generationScoped && !nextScopedGeneration) {
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
          (expandedUserId && visibleUsers.some((user) => user.id === expandedUserId)
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
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationScoped, generationSortOrder]);

  useEffect(() => {
    if (inlineDetailMode) {
      setDrawerQuery(null);
      return;
    }
    normalizeDrawerQuery();
  }, [inlineDetailMode, normalizeDrawerQuery, setDrawerQuery]);

  useEffect(() => {
    if (inlineDetailMode) {
      return;
    }

    if (isLoading) {
      return;
    }

    if (queryState.panel === "create") {
      setDrawerQuery(null);
      return;
    }

    if (queryState.panel === "edit") {
      const target = items.find((user) => user.id === queryState.id) ?? null;
      if (!target) {
        setDrawerQuery(null);
        return;
      }

      if (selectedId !== target.id || !panelOpen) {
        void handleSelect(target);
      }
      return;
    }

    if (panelOpen) {
      setPanelOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryState, isLoading, items, selectedId, panelOpen]);

  const toggleSelection = (userId: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
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

  const handleSelect = async (user: ApiUser) => {
    setSelectedId(user.id);
    if (inlineDetailMode) {
      return;
    }
    setPanelOpen(true);
    setDrawerQuery("edit", user.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    await loadUserDetail(user.id);
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
        generationId: scopedGenerationId ?? (editForm.generationId || null),
      };

      await adminResourceApi.updateUser(selectedDetail.id, payload);
      setSuccessMessage("사용자 정보를 수정했습니다.");
      await loadData(selectedDetail.id);
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
      if (!inlineDetailMode) {
        setPanelOpen(false);
        setDrawerQuery(null);
      }
      setSelectedIds((previous) => previous.filter((id) => id !== selectedDetail.id));
      await loadData();
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
      const results = await Promise.allSettled(
        targetIds.map((id) =>
          adminResourceApi.updateUser(id, {
            role: bulkRole,
          }),
        ),
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        setSuccessMessage(`${successCount}명의 권한을 ${readAdminRoleLabel(bulkRole)}로 변경했습니다.`);
      }
      if (failureCount > 0) {
        setErrorMessage(`${failureCount}명의 권한 변경에 실패했습니다.`);
      }

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
      const successCount = results.filter((result) => result.status === "fulfilled").length;
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
        if (!inlineDetailMode) {
          setPanelOpen(false);
          setDrawerQuery(null);
        }
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
        <h3 className="mb-2 text-sm font-semibold text-gray-900">선택 사용자 상세 정보</h3>
        {isDetailLoading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : selectedDetail ? (
          <div className="space-y-1 text-sm text-gray-700">
            <p>사용자 ID: {selectedDetail.id}</p>
            <p>표시 이름: {formatKoreanName(selectedDetail)}</p>
            <p>이메일: {selectedDetail.email}</p>
            <p>권한: {readAdminRoleLabel(selectedDetail.role)}</p>
            <p>성/이름: {(selectedDetail.familyName ?? "-")}/{(selectedDetail.givenName ?? "-")}</p>
            <p>대학/학과: {(selectedDetail.college ?? "-")}/{(selectedDetail.department ?? "-")}</p>
            <p>학번: {selectedDetail.studentNumber ?? "-"}</p>
            <p>전화번호: {selectedDetail.phoneNumber ?? "-"}</p>
            <p>소속 기수: {selectedDetail.generationId ?? "없음"}</p>
            <p>가입일: {formatTimestamp(selectedDetail.createdAt)}</p>
            <p>최근 수정일: {formatTimestamp(selectedDetail.updatedAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">사용자를 선택해 주세요.</p>
        )}
      </div>

      <form onSubmit={handleUpdate} className="space-y-3" data-testid="user-edit-form">
        {selectedDetail ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block">레거시 이름</span>
              <input
                type="text"
                value={editForm.name}
                onChange={(event) =>
                  setEditForm((previous) => ({ ...previous, name: event.target.value }))
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
                  setEditForm((previous) => ({ ...previous, role: event.target.value }))
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
                소속 기수는 현재 선택한 기수로 고정됩니다.
              </div>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block">소속 기수 (선택)</span>
                <select
                  value={editForm.generationId}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      generationId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-generation-id"
                >
                  <option value="">없음</option>
                  {generations.map((generation) => (
                    <option key={generation.id} value={generation.id}>
                      {generation.name} ({generation.sortOrder})
                    </option>
                  ))}
                </select>
              </label>
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
              disabled={isSubmitting}
              testIdPrefix="user-edit-image"
            />

            <div className="mt-2 flex gap-2">
              <AdminActionButton
                type="submit"
                disabled={isSubmitting || imageUpload.isUploading || imageUpload.hasUploadError}
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
          <p className="text-sm text-gray-500">수정할 사용자를 선택해 주세요.</p>
        )}
      </form>
    </>
  );

  return (
    <div className="space-y-6" data-testid="users-page">
      <AdminPageHeader
        title="사용자 관리"
        description="가입한 사용자 정보를 조회하고 권한/소속을 관리하는 화면입니다."
        guidance="검색/필터/다중 선택을 이용해 여러 사용자 권한을 한 번에 변경할 수 있습니다."
      >
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
            <p className="text-xs text-gray-500" data-testid="users-scoped-generation">
              {scopedGeneration
                ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
                : "현재 기수를 확인하는 중..."}
            </p>
          ) : null}
        </div>
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        프로필 이미지는 파일 선택 즉시 업로드됩니다. 업로드가 끝난 뒤 저장하면 사용자 정보에 반영됩니다.
      </AdminInfoBox>

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
              onChange={(event) => setRoleFilter(event.target.value as RoleFilterValue)}
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
            <p data-testid="user-selected-count">선택된 사용자: {selectedIds.length}명</p>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => handleToggleSelectAllVisible(event.target.checked)}
                data-testid="user-select-all-visible"
              />
              <span>현재 목록 전체 선택</span>
            </label>
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
              disabled={isSubmitting || selectedIds.length === 0 || !isAllowedAdminRole(bulkRole)}
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
          <ul className="space-y-2" data-testid="users-list">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className={`rounded-md border p-3 ${
                  selectedId === item.id ? "border-emerald-300 bg-emerald-50/40" : "border-gray-200"
                }`}
                data-testid={`user-row-${item.id}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIdSet.has(item.id)}
                    onChange={(event) => toggleSelection(item.id, event.target.checked)}
                    className="mt-1 h-4 w-4"
                    data-testid={`user-select-${item.id}`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSelect(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium">{formatKoreanName(item)}</p>
                    <p className="text-xs text-gray-500">{item.email}</p>
                    <p className="text-xs text-gray-500">
                      권한: {readAdminRoleLabel(item.role)}
                    </p>
                  </button>
                  {inlineDetailMode ? (
                    <button
                      type="button"
                      onClick={() => void handleToggleInlineDetail(item)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      data-testid={`user-inline-toggle-${item.id}`}
                    >
                      {expandedUserId === item.id ? "상세 닫기" : "상세 보기"}
                    </button>
                  ) : null}
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

      {!inlineDetailMode ? (
        <AdminDrawer
          open={panelOpen}
          title="사용자 수정"
          description={
            selectedDetail
              ? `${selectedDetail.email} 계정을 편집합니다.`
              : "사용자 상세 정보를 불러오는 중입니다."
          }
          onClose={() => {
            if (!isSubmitting) {
              setPanelOpen(false);
              setDrawerQuery(null);
            }
          }}
          testId="user-drawer"
        >
          {renderUserEditor()}
        </AdminDrawer>
      ) : null}

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
