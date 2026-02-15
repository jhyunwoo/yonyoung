"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import type { ApiLinktree, ApiLinktreeItem } from "../../../../lib/admin-api/types";
import { readErrorMessage } from "../components/admin-form-utils";

type LinktreeFormState = {
  name: string;
};

type LinktreeItemFormState = {
  name: string;
  link: string;
};

const emptyLinktreeForm: LinktreeFormState = {
  name: "",
};

const emptyItemForm: LinktreeItemFormState = {
  name: "",
  link: "",
};

type LinktreeAdminPageProps = {
  generationSortOrder?: number | null;
};

export default function LinktreeAdminPage({
  generationSortOrder = null,
}: LinktreeAdminPageProps = {}) {
  const [items, setItems] = useState<ApiLinktree[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<LinktreeFormState>(emptyLinktreeForm);
  const [editForm, setEditForm] = useState<LinktreeFormState>(emptyLinktreeForm);
  const [itemCreateForm, setItemCreateForm] = useState<LinktreeItemFormState>(emptyItemForm);
  const [itemEditForm, setItemEditForm] = useState<LinktreeItemFormState>(emptyItemForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedItem = useMemo(
    () => selected?.items.find((item) => item.id === selectedItemId) ?? null,
    [selected, selectedItemId],
  );

  const syncEditForm = (item: ApiLinktree | null) => {
    if (!item) {
      setEditForm(emptyLinktreeForm);
      return;
    }

    setEditForm({
      name: item.name,
    });
  };

  const syncItemEditForm = (item: ApiLinktreeItem | null) => {
    if (!item) {
      setItemEditForm(emptyItemForm);
      return;
    }

    setItemEditForm({
      name: item.name,
      link: item.link,
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await adminResourceApi.listLinktrees();
      setItems(data);

      if (data.length === 0) {
        setSelectedId(null);
        setSelectedItemId(null);
        syncEditForm(null);
        syncItemEditForm(null);
        return;
      }

      const fallbackId = data[0]?.id;
      if (!fallbackId) {
        setSelectedId(null);
        setSelectedItemId(null);
        syncEditForm(null);
        syncItemEditForm(null);
        return;
      }

      const nextSelectedId =
        selectedId && data.some((item) => item.id === selectedId)
          ? selectedId
          : fallbackId;
      setSelectedId(nextSelectedId);

      const selectedLinktree = data.find((item) => item.id === nextSelectedId) ?? null;
      syncEditForm(selectedLinktree);

      const nextItemId =
        selectedItemId && selectedLinktree?.items.some((item) => item.id === selectedItemId)
          ? selectedItemId
          : selectedLinktree?.items[0]?.id ?? null;
      setSelectedItemId(nextItemId);
      syncItemEditForm(
        nextItemId
          ? selectedLinktree?.items.find((item) => item.id === nextItemId) ?? null
          : null,
      );
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

  const handleSelectLinktree = (item: ApiLinktree) => {
    setSelectedId(item.id);
    syncEditForm(item);
    const firstItem = item.items[0] ?? null;
    setSelectedItemId(firstItem?.id ?? null);
    syncItemEditForm(firstItem);
  };

  const handleSelectItem = (item: ApiLinktreeItem) => {
    setSelectedItemId(item.id);
    syncItemEditForm(item);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.createLinktree({
        name: createForm.name.trim(),
      });

      setCreateForm(emptyLinktreeForm);
      setSuccessMessage("링크트리를 생성했습니다.");
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
      await adminResourceApi.updateLinktree(selected.id, {
        name: editForm.name.trim(),
      });

      setSuccessMessage("링크트리를 수정했습니다.");
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

    if (!window.confirm("선택한 링크트리를 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteLinktree(selected.id);
      setSuccessMessage("링크트리를 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.addLinktreeItem(selected.id, {
        name: itemCreateForm.name.trim(),
        link: itemCreateForm.link.trim(),
      });

      setItemCreateForm(emptyItemForm);
      setSuccessMessage("링크 아이템을 추가했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !selectedItem) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateLinktreeItem(selected.id, selectedItem.id, {
        name: itemEditForm.name.trim(),
        link: itemEditForm.link.trim(),
      });

      setSuccessMessage("링크 아이템을 수정했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selected || !selectedItem) {
      return;
    }

    if (!window.confirm("선택한 링크 아이템을 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteLinktreeItem(selected.id, selectedItem.id);
      setSuccessMessage("링크 아이템을 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="linktree-page">
      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Linktree</h1>
        <p className="mt-1 text-sm text-gray-600">링크트리 및 하위 아이템 CRUD를 관리합니다.</p>
        {generationSortOrder !== null ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="linktree-global-note">
            Global resource: 선택한 {generationSortOrder}기와 관계없이 공통으로 적용됩니다.
          </p>
        ) : null}
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="linktree-error">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="linktree-success">
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
              data-testid="linktree-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2" data-testid="linktree-list">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`linktree-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">items: {item.items.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectLinktree(item)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        selectedId === item.id
                          ? "bg-black text-white"
                          : "border border-gray-300 text-gray-700"
                      }`}
                      data-testid={`linktree-select-${item.id}`}
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
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="linktree-create-form">
            <h2 className="mb-3 text-lg font-semibold">링크트리 생성</h2>
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
                data-testid="linktree-create-name"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="linktree-create-submit"
            >
              생성
            </button>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="linktree-edit-form">
            <h2 className="mb-3 text-lg font-semibold">링크트리 수정/삭제</h2>
            {selected ? (
              <>
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
                    data-testid="linktree-edit-name"
                  />
                </label>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    data-testid="linktree-edit-submit"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                    data-testid="linktree-delete-button"
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 링크트리를 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreateItem} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="linktree-item-create-form">
          <h2 className="mb-3 text-lg font-semibold">링크 아이템 추가</h2>
          {selected ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">선택된 링크트리: {selected.name}</p>
              <label className="block text-sm">
                <span className="mb-1 block">name</span>
                <input
                  type="text"
                  value={itemCreateForm.name}
                  onChange={(event) =>
                    setItemCreateForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="linktree-item-create-name"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">link</span>
                <input
                  type="url"
                  value={itemCreateForm.link}
                  onChange={(event) =>
                    setItemCreateForm((previous) => ({ ...previous, link: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="linktree-item-create-link"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                data-testid="linktree-item-create-submit"
              >
                추가
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">링크트리를 먼저 선택해 주세요.</p>
          )}
        </form>

        <article className="rounded-lg border border-gray-200 bg-white p-4" data-testid="linktree-item-edit-card">
          <h2 className="mb-3 text-lg font-semibold">링크 아이템 수정/삭제</h2>
          {selected ? (
            <>
              {selected.items.length === 0 ? (
                <p className="text-sm text-gray-500">아이템이 없습니다.</p>
              ) : (
                <ul className="mb-4 space-y-2" data-testid="linktree-item-list">
                  {selected.items.map((item) => (
                    <li key={item.id} className="rounded-md border border-gray-200 p-2" data-testid={`linktree-item-row-${item.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-gray-500">{item.link}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            selectedItemId === item.id
                              ? "bg-black text-white"
                              : "border border-gray-300 text-gray-700"
                          }`}
                          data-testid={`linktree-item-select-${item.id}`}
                        >
                          {selectedItemId === item.id ? "선택됨" : "선택"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleUpdateItem} className="space-y-3" data-testid="linktree-item-edit-form">
                {selectedItem ? (
                  <>
                    <label className="block text-sm">
                      <span className="mb-1 block">name</span>
                      <input
                        type="text"
                        value={itemEditForm.name}
                        onChange={(event) =>
                          setItemEditForm((previous) => ({ ...previous, name: event.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="linktree-item-edit-name"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block">link</span>
                      <input
                        type="url"
                        value={itemEditForm.link}
                        onChange={(event) =>
                          setItemEditForm((previous) => ({ ...previous, link: event.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="linktree-item-edit-link"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        data-testid="linktree-item-edit-submit"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteItem}
                        disabled={isSubmitting}
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                        data-testid="linktree-item-delete-button"
                      >
                        삭제
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">수정할 링크 아이템을 선택해 주세요.</p>
                )}
              </form>
            </>
          ) : (
            <p className="text-sm text-gray-500">링크트리를 먼저 선택해 주세요.</p>
          )}
        </article>
      </section>
    </div>
  );
}
