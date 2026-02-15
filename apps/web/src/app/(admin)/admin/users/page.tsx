"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS, uploadWithPresign, type ImageValueMode } from "../../../../lib/admin-api/upload";
import type { ApiAdminUpdateUserInput, ApiGeneration, ApiUser } from "../../../../lib/admin-api/types";
import {
  ADMIN_USER_ROLE_OPTIONS,
  formatTimestamp,
  readErrorMessage,
} from "../components/admin-form-utils";
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

const isAllowedAdminRole = (
  role: string,
): role is NonNullable<ApiAdminUpdateUserInput["role"]> =>
  (ADMIN_USER_ROLE_OPTIONS as readonly string[]).includes(role);

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
  const [editForm, setEditForm] = useState<UserFormState>(emptyForm);

  const [imageMode, setImageMode] = useState<ImageValueMode>("url");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

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

  const loadData = async () => {
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
        selectedId && visibleUsers.some((user) => user.id === selectedId)
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

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationScoped, generationSortOrder]);

  const handleSelect = async (user: ApiUser) => {
    setSelectedId(user.id);
    setIsDetailLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const detail = await adminResourceApi.getUserById(user.id);
      setSelectedDetail(detail);
      syncForm(detail);
      setImageMode("url");
      setImageFile(null);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const resolveUserImage = async (): Promise<string | null> => {
    if (imageMode === "url") {
      const trimmed = editForm.image.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (!imageFile) {
      throw new Error("프로필 이미지 파일을 선택해 주세요.");
    }

    return uploadWithPresign({
      presignPath: PRESIGN_PATHS.userProfile,
      file: imageFile,
    });
  };

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

      setImageMode("url");
      setImageFile(null);
      setSuccessMessage("사용자 정보를 수정했습니다.");
      await loadData();
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

    if (!window.confirm("선택한 사용자를 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteUser(selectedDetail.id);
      setSuccessMessage("사용자를 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-gray-600">사용자 목록/단건 조회 및 관리자 권한 수정/삭제를 수행합니다.</p>
        {generationScoped ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="users-scoped-generation">
            {scopedGeneration
              ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
              : "현재 기수를 확인하는 중..."}
          </p>
        ) : null}
      </header>

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
            <h2 className="text-lg font-semibold">목록</h2>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="users-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2" data-testid="users-list">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`user-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.email}</p>
                      <p className="text-xs text-gray-500">role: {item.role ?? "null"}</p>
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
        </article>

        <article className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4" data-testid="user-detail-card">
            <h2 className="mb-3 text-lg font-semibold">단건 조회</h2>
            {isDetailLoading ? (
              <p className="text-sm text-gray-500">불러오는 중...</p>
            ) : selectedDetail ? (
              <div className="space-y-1 text-sm text-gray-700">
                <p>ID: {selectedDetail.id}</p>
                <p>Email: {selectedDetail.email}</p>
                <p>Role: {selectedDetail.role ?? "null"}</p>
                <p>Generation: {selectedDetail.generationId ?? "null"}</p>
                <p>CreatedAt: {formatTimestamp(selectedDetail.createdAt)}</p>
                <p>UpdatedAt: {formatTimestamp(selectedDetail.updatedAt)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">사용자를 선택해 주세요.</p>
            )}
          </div>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="user-edit-form">
            <h2 className="mb-3 text-lg font-semibold">사용자 수정/삭제</h2>
            {selectedDetail ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block">name</span>
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
                    <span className="mb-1 block">nickname (empty -&gt; null)</span>
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
                    <span className="mb-1 block">role</span>
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
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>

                  {scopedGenerationId ? (
                    <div
                      className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                      data-testid="user-scoped-generation-field"
                    >
                      generationId는 현재 기수로 고정됩니다.
                    </div>
                  ) : (
                    <label className="block text-sm">
                      <span className="mb-1 block">generationId (empty -&gt; null)</span>
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
                        <option value="">null</option>
                        {generations.map((generation) => (
                          <option key={generation.id} value={generation.id}>
                            {generation.name} ({generation.sortOrder})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <ImageInput
                    label="image (URL empty -> null)"
                    mode={imageMode}
                    onModeChange={setImageMode}
                    urlValue={editForm.image}
                    onUrlChange={(value) =>
                      setEditForm((previous) => ({ ...previous, image: value }))
                    }
                    file={imageFile}
                    onFileChange={setImageFile}
                    disabled={isSubmitting}
                    testIdPrefix="user-edit-image"
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    data-testid="user-edit-submit"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                    data-testid="user-delete-button"
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 사용자를 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>

      {selected ? (
        <p className="text-xs text-gray-500" data-testid="users-selected-email">
          selected: {selected.email}
        </p>
      ) : null}
    </div>
  );
}
