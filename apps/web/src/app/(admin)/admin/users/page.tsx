"use client";

import { type FormEvent, useEffect, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS, uploadWithPresign } from "../../../../lib/admin-api/upload";
import type { ApiAdminUpdateUserInput, ApiGeneration, ApiUser } from "../../../../lib/admin-api/types";
import {
  ADMIN_USER_ROLE_OPTIONS,
  formatTimestamp,
  readErrorMessage,
} from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import ImageInput from "../components/image-input";

type UserFormState = {
  name: string;
  nickname: string;
  role: string;
  generationId: string;
  image: string;
};

const emptyForm: UserFormState = {
  name: "",
  nickname: "",
  role: "unverified",
  generationId: "",
  image: "",
};

/**
 * isAllowedAdminRole 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param role 권한 판단에 사용되는 역할 정보입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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

/**
 * UsersAdminPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  generationScoped = false,
  generationSortOrder = null,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 리렌더링 타이밍에 따라 훅 의존성 배열을 신중히 관리해야 합니다.
 */
export default function UsersAdminPage({
  generationScoped = false,
  generationSortOrder = null,
}: UsersAdminPageProps = {}) {
  const [items, setItems] = useState<ApiUser[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<"delete" | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;

    /**
   * syncForm의 핵심 비즈니스 로직을 수행합니다.
   * @param user 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const syncForm = (user: ApiUser | null) => {
    if (!user) {
      setEditForm(emptyForm);
      return;
    }

    setEditForm({
      name: user.name,
      nickname: user.nickname ?? "",
      role: user.role ?? "unverified",
      generationId: user.generationId ?? "",
      image: user.image ?? "",
    });
  };

    /**
   * loadData 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
   * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [users, generationList] = await Promise.all([
        adminResourceApi.listUsers(),
        adminResourceApi.listGenerations(),
      ]);

      const nextScopedGeneration = generationScoped
        ? generationList.find(/** generationList.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => generation.sortOrder === generationSortOrder) ?? null
        : null;
      const visibleGenerations = generationScoped
        ? nextScopedGeneration
          ? [nextScopedGeneration]
          : []
        : generationList;
      const visibleUsers =
        generationScoped && nextScopedGeneration
          ? users.filter(/** users.filter 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param user 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (user) => user.generationId === nextScopedGeneration.id)
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
        return;
      }

      if (visibleUsers.length === 0) {
        setSelectedId(null);
        setSelectedDetail(null);
        syncForm(null);
        return;
      }

      const fallbackId = visibleUsers[0]?.id;
      if (!fallbackId) {
        setSelectedId(null);
        setSelectedDetail(null);
        syncForm(null);
        return;
      }

      const nextSelectedId =
        selectedId && visibleUsers.some(/** visibleUsers.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param user 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (user) => user.id === selectedId)
          ? selectedId
          : fallbackId;
      setSelectedId(nextSelectedId);

      const detail = await adminResourceApi.getUserById(nextSelectedId);
      setSelectedDetail(detail);
      syncForm(detail);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(/** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationScoped, generationSortOrder]);

    /**
   * handleSelect의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param user 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSelect = async (user: ApiUser) => {
    setSelectedId(user.id);
    setIsDetailLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const detail = await adminResourceApi.getUserById(user.id);
      setSelectedDetail(detail);
      syncForm(detail);
      setImageFile(null);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

    /**
   * resolveUserImage 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
   * @returns 조회/계산된 결과 값을 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const resolveUserImage = async (): Promise<string | null> => {
    if (!imageFile) {
      const trimmed = editForm.image.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    setImageUploadProgress(0);
    return uploadWithPresign({
      presignPath: PRESIGN_PATHS.userProfile,
      file: imageFile,
      onProgress: setImageUploadProgress,
    });
  };

    /**
   * handleUpdate의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDetail) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const image = await resolveUserImage();
      const payload: ApiAdminUpdateUserInput = {
        name: editForm.name.trim(),
        nickname: editForm.nickname.trim() || null,
        image,
        role: isAllowedAdminRole(editForm.role) ? editForm.role : "unverified",
        generationId: scopedGenerationId ?? (editForm.generationId || null),
      };

      await adminResourceApi.updateUser(selectedDetail.id, payload);

      setImageFile(null);
      setImageUploadProgress(null);
      setSuccessMessage("사용자 정보를 수정했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setImageUploadProgress(null);
    }
  };

    /**
   * handleDelete의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const openDeleteModal = () => {
    if (!selectedDetail || isSubmitting) {
      return;
    }
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <AdminPageHeader
        title="사용자 관리"
        description="가입한 사용자 정보를 조회하고 권한/소속을 관리하는 화면입니다."
        guidance="왼쪽에서 사용자를 선택하면 오른쪽에서 상세 정보 확인과 수정을 진행할 수 있습니다."
      >
        {generationScoped ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="users-scoped-generation">
            {scopedGeneration
              ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
              : "현재 기수를 확인하는 중..."}
          </p>
        ) : null}
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        권한 변경은 운영 권한에 직접 영향을 줍니다. 삭제는 확인 창에서 한 번 더 검토한 뒤 진행해 주세요.
      </AdminInfoBox>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="users-error">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="users-success">
          {successMessage}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">사용자 목록</h2>
            <button
              type="button"
              onClick={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => void loadData()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="users-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">표시할 사용자가 없습니다.</p>
          ) : (
            <ul className="space-y-2" data-testid="users-list">
              {items.map(/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`user-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                      <p className="text-xs text-gray-500">권한: {readAdminRoleLabel(item.role)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => void handleSelect(item)}
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
        </article>

        <article className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4" data-testid="user-detail-card">
            <h2 className="mb-3 text-lg font-semibold">선택 사용자 상세 정보</h2>
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

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="user-edit-form">
            <h2 className="mb-3 text-lg font-semibold">선택 사용자 수정/삭제</h2>
            {selectedDetail ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block">이름</span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
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
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, nickname: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      data-testid="user-edit-nickname"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">권한</span>
                    <select
                      value={editForm.role}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, role: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="user-edit-role"
                    >
                      {ADMIN_USER_ROLE_OPTIONS.map(/** ADMIN_USER_ROLE_OPTIONS.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param role 권한 판단에 사용되는 역할 정보입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (role) => (
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
                        onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                          setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({
                            ...previous,
                            generationId: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        data-testid="user-edit-generation-id"
                      >
                        <option value="">없음</option>
                        {generations.map(/** generations.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => (
                          <option key={generation.id} value={generation.id}>
                            {generation.name} ({generation.sortOrder})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <ImageInput
                    label="프로필 이미지"
                    file={imageFile}
                    onFileChange={setImageFile}
                    uploadProgress={imageUploadProgress}
                    isUploading={imageUploadProgress !== null}
                    disabled={isSubmitting}
                    testIdPrefix="user-edit-image"
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <AdminActionButton
                    type="submit"
                    disabled={isSubmitting}
                    testId="user-edit-submit"
                  >
                    수정 저장
                  </AdminActionButton>
                  <AdminActionButton
                    variant="danger"
                    onClick={openDeleteModal}
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
        </article>
      </section>

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
        onConfirm={/** onConfirm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => void handleDelete()}
        onClose={/** onClose 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
          if (isSubmitting) {
            return;
          }
          setDeleteModalOpen(false);
        }}
      />

    </div>
  );
}
