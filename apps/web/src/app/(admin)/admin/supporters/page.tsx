"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS, resolveImageValue } from "../../../../lib/admin-api/upload";
import type { ApiSupporter } from "../../../../lib/admin-api/types";
import {
  formatTimestamp,
  readErrorMessage,
  toDateInputValue,
  toTimestampMs,
} from "../components/admin-form-utils";
import ImageInput, { type ImageInputMode } from "../components/image-input";

type SupporterFormState = {
  name: string;
  link: string;
  logoUrl: string;
  expiresAt: string;
};

const emptyForm: SupporterFormState = {
  name: "",
  link: "",
  logoUrl: "",
  expiresAt: "",
};

type SupportersAdminPageProps = {
  generationSortOrder?: number | null;
};

export default function SupportersAdminPage({
  generationSortOrder = null,
}: SupportersAdminPageProps = {}) {
  const [items, setItems] = useState<ApiSupporter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<SupporterFormState>(emptyForm);
  const [editForm, setEditForm] = useState<SupporterFormState>(emptyForm);

  const [createMode, setCreateMode] = useState<ImageInputMode>("url");
  const [editMode, setEditMode] = useState<ImageInputMode>("url");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const syncEditForm = (item: ApiSupporter | null) => {
    if (!item) {
      setEditForm(emptyForm);
      return;
    }

    setEditForm({
      name: item.name,
      link: item.link,
      logoUrl: item.logoUrl,
      expiresAt: toDateInputValue(item.expiresAt),
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await adminResourceApi.listSupporters();
      setItems(data);

      if (data.length === 0) {
        setSelectedId(null);
        syncEditForm(null);
      } else {
        const fallbackId = data[0]?.id;
        if (!fallbackId) {
          setSelectedId(null);
          syncEditForm(null);
          return;
        }

        const nextSelectedId =
          selectedId && data.some((item) => item.id === selectedId)
            ? selectedId
            : fallbackId;
        setSelectedId(nextSelectedId);
        syncEditForm(data.find((item) => item.id === nextSelectedId) ?? null);
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (item: ApiSupporter) => {
    setSelectedId(item.id);
    syncEditForm(item);
    setEditMode("url");
    setEditFile(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const logoUrl = await resolveImageValue({
        mode: createMode,
        urlValue: createForm.logoUrl,
        file: createFile,
        presignPath: PRESIGN_PATHS.supporterLogo,
        fieldLabel: "로고",
      });

      await adminResourceApi.createSupporter({
        name: createForm.name.trim(),
        link: createForm.link.trim(),
        logoUrl,
        expiresAt: toTimestampMs(createForm.expiresAt),
      });

      setCreateForm(emptyForm);
      setCreateMode("url");
      setCreateFile(null);
      setSuccessMessage("후원사를 생성했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const logoUrl = await resolveImageValue({
        mode: editMode,
        urlValue: editForm.logoUrl,
        file: editFile,
        presignPath: PRESIGN_PATHS.supporterLogo,
        fieldLabel: "로고",
      });

      await adminResourceApi.updateSupporter(selected.id, {
        name: editForm.name.trim(),
        link: editForm.link.trim(),
        logoUrl,
        expiresAt: toTimestampMs(editForm.expiresAt),
      });

      setSuccessMessage("후원사를 수정했습니다.");
      setEditMode("url");
      setEditFile(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }

    if (!window.confirm("선택한 후원사를 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteSupporter(selected.id);
      setSuccessMessage("후원사를 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="supporters-page">
      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Supporters</h1>
        <p className="mt-1 text-sm text-gray-600">후원사 CRUD를 관리합니다.</p>
        {generationSortOrder !== null ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="supporters-global-note">
            Global resource: 선택한 {generationSortOrder}기와 관계없이 공통으로 적용됩니다.
          </p>
        ) : null}
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="supporters-error">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="supporters-success">
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
              data-testid="supporters-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2" data-testid="supporters-list">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`supporter-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="truncate text-xs text-gray-500">{item.link}</p>
                      <p className="text-xs text-gray-500">expiresAt: {formatTimestamp(item.expiresAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        selectedId === item.id
                          ? "bg-black text-white"
                          : "border border-gray-300 text-gray-700"
                      }`}
                      data-testid={`supporter-select-${item.id}`}
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
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="supporter-create-form">
            <h2 className="mb-3 text-lg font-semibold">생성</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">name</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="supporter-create-name"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">link</span>
                <input
                  type="url"
                  value={createForm.link}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, link: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="supporter-create-link"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">expiresAt</span>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, expiresAt: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="supporter-create-expires-at"
                />
              </label>

              <ImageInput
                label="logoUrl"
                mode={createMode}
                onModeChange={setCreateMode}
                urlValue={createForm.logoUrl}
                onUrlChange={(value) =>
                  setCreateForm((previous) => ({ ...previous, logoUrl: value }))
                }
                file={createFile}
                onFileChange={setCreateFile}
                testIdPrefix="supporter-create-logo"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="supporter-create-submit"
            >
              생성
            </button>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="supporter-edit-form">
            <h2 className="mb-3 text-lg font-semibold">수정/삭제</h2>
            {selected ? (
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
                      data-testid="supporter-edit-name"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">link</span>
                    <input
                      type="url"
                      value={editForm.link}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, link: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="supporter-edit-link"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">expiresAt</span>
                    <input
                      type="date"
                      value={editForm.expiresAt}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, expiresAt: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="supporter-edit-expires-at"
                    />
                  </label>

                  <ImageInput
                    label="logoUrl"
                    mode={editMode}
                    onModeChange={setEditMode}
                    urlValue={editForm.logoUrl}
                    onUrlChange={(value) =>
                      setEditForm((previous) => ({ ...previous, logoUrl: value }))
                    }
                    file={editFile}
                    onFileChange={setEditFile}
                    testIdPrefix="supporter-edit-logo"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    data-testid="supporter-edit-submit"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                    data-testid="supporter-delete-button"
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 후원사를 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>
    </div>
  );
}
