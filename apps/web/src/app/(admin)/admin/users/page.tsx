"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import type { ApiAdminUpdateUserInput, ApiGeneration, ApiUser } from "../../../../lib/admin-api/types";
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
  nickname: string;
  role: string;
  generationId: string;
};

const emptyForm: UserFormState = {
  name: "",
  nickname: "",
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

type UsersAdminPageProps = {
  generationScoped?: boolean;
  generationSortOrder?: number | null;
};

export default function UsersAdminPage({
  generationScoped = false,
  generationSortOrder = null,
}: UsersAdminPageProps = {}) {
  const [items, setItems] = useState<ApiUser[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiUser | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm);
  const imageUpload = useImmediateImageUpload({ presignPath: PRESIGN_PATHS.userProfile });

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<"delete" | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { queryState, setDrawerQuery, normalizeDrawerQuery } = useAdminDrawerQuerySync();

  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!query) {
      return sorted;
    }

    return sorted.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.nickname ?? "").toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const syncForm = (user: ApiUser | null) => {
    if (!user) {
      setEditForm(emptyForm);
      imageUpload.reset(null);
      return;
    }

    setEditForm({
      name: user.name,
      nickname: user.nickname ?? "",
      role: user.role ?? "unverified",
      generationId: user.generationId ?? "",
    });
    imageUpload.reset(user.image ?? "");
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

      if (generationScoped && !nextScopedGeneration) {
        setSelectedId(null);
        setSelectedDetail(null);
        syncForm(null);
        setErrorMessage("선택한 기수를 찾을 수 없습니다.");
        setPanelOpen(false);
        return;
      }

      if (visibleUsers.length === 0) {
        setSelectedId(null);
        setSelectedDetail(null);
        syncForm(null);
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
        setSelectedDetail(null);
        syncForm(null);
        return;
      }

      const detail = await adminResourceApi.getUserById(candidateSelectedId);
      setSelectedDetail(detail);
      syncForm(detail);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationScoped, generationSortOrder]);

  useEffect(() => {
    normalizeDrawerQuery();
  }, [normalizeDrawerQuery]);

  useEffect(() => {
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

  const handleSelect = async (user: ApiUser) => {
    setSelectedId(user.id);
    setPanelOpen(true);
    setDrawerQuery("edit", user.id);
    setIsDetailLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const detail = await adminResourceApi.getUserById(user.id);
      setSelectedDetail(detail);
      syncForm(detail);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
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
        nickname: editForm.nickname.trim() || null,
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
      setPanelOpen(false);
      setDrawerQuery(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <AdminPageHeader
        title="사용자 관리"
        description="가입한 사용자 정보를 조회하고 권한/소속을 관리하는 화면입니다."
        guidance="목록에서 사용자 선택 시 오른쪽 패널에서 상세 정보 및 수정 작업을 할 수 있습니다."
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

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">사용자 목록</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="이름/이메일 검색"
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="user-search-input"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? "표시할 사용자가 없습니다."
              : "검색 조건에 맞는 사용자가 없습니다."}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="users-list">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-gray-200 p-3"
                data-testid={`user-row-${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.email}</p>
                    <p className="text-xs text-gray-500">
                      권한: {readAdminRoleLabel(item.role)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSelect(item)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      selectedId === item.id
                        ? "bg-black text-white"
                        : "border border-gray-300 text-gray-700"
                    }`}
                    data-testid={`user-select-${item.id}`}
                  >
                    {selectedId === item.id ? "선택됨" : "선택"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
              <p>이메일: {selectedDetail.email}</p>
              <p>권한: {readAdminRoleLabel(selectedDetail.role)}</p>
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
                <span className="mb-1 block">이름</span>
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

              <label className="block text-sm">
                <span className="mb-1 block">별칭 (선택)</span>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, nickname: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  data-testid="user-edit-nickname"
                />
              </label>

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
    </div>
  );
}
