"use client";

import { useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import type { ApiGeneration, ApiUser } from "../../../../lib/admin-api/types";
import {
  formatTimestamp,
  readErrorMessage,
  toDateInputValue,
  toPositiveInteger,
  toTimestampMs,
} from "../components/admin-form-utils";

type GenerationFormState = {
  name: string;
  sortOrder: string;
  startDate: string;
  endDate: string;
};

const emptyForm: GenerationFormState = {
  name: "",
  sortOrder: "",
  startDate: "",
  endDate: "",
};

export default function GenerationsAdminPage() {
  const [items, setItems] = useState<ApiGeneration[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<GenerationFormState>(emptyForm);
  const [editForm, setEditForm] = useState<GenerationFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );
  const selectedMembers = useMemo(() => {
    if (!selected) {
      return [];
    }
    return users.filter((user) => user.generationId === selected.id);
  }, [selected, users]);
  const assignableUsers = useMemo(() => {
    if (!selected) {
      return [];
    }
    return users.filter((user) => user.generationId !== selected.id);
  }, [selected, users]);

  const syncEditForm = (item: ApiGeneration | null) => {
    if (!item) {
      setEditForm(emptyForm);
      return;
    }

    setEditForm({
      name: item.name,
      sortOrder: String(item.sortOrder),
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
    });
  };

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [generationData, userData] = await Promise.all([
        adminResourceApi.listGenerations(),
        adminResourceApi.listUsers(),
      ]);

      setItems(generationData);
      setUsers(userData);

      if (generationData.length === 0) {
        setSelectedId(null);
        syncEditForm(null);
      } else {
        const fallbackId = generationData[0]?.id;
        if (!fallbackId) {
          setSelectedId(null);
          syncEditForm(null);
          return;
        }

        const keepSelection =
          selectedId && generationData.some((item) => item.id === selectedId)
            ? selectedId
            : fallbackId;
        setSelectedId(keepSelection);
        const selectedItem =
          generationData.find((item) => item.id === keepSelection) ?? null;
        syncEditForm(selectedItem);
      }
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.createGeneration({
        name: createForm.name.trim(),
        sortOrder: toPositiveInteger(createForm.sortOrder, "sortOrder"),
        startDate: toTimestampMs(createForm.startDate),
        endDate: toTimestampMs(createForm.endDate),
      });
      setCreateForm(emptyForm);
      setSuccessMessage("기수를 생성했습니다.");
      await loadItems();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateGeneration(selected.id, {
        name: editForm.name.trim(),
        sortOrder: toPositiveInteger(editForm.sortOrder, "sortOrder"),
        startDate: toTimestampMs(editForm.startDate),
        endDate: toTimestampMs(editForm.endDate),
      });
      setSuccessMessage("기수를 수정했습니다.");
      await loadItems();
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

    const confirmed = window.confirm("선택한 기수를 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteGeneration(selected.id);
      setSuccessMessage("기수를 삭제했습니다.");
      await loadItems();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = (item: ApiGeneration) => {
    setSelectedId(item.id);
    syncEditForm(item);
  };

  const handleAssignMember = async (userId: string) => {
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateUser(userId, {
        generationId: selected.id,
      });
      setSuccessMessage("기수 멤버를 구성했습니다.");
      await loadItems();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignMember = async (userId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateUser(userId, {
        generationId: null,
      });
      setSuccessMessage("기수에서 멤버를 해제했습니다.");
      await loadItems();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="generations-page">
      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Generations</h1>
        <p className="mt-1 text-sm text-gray-600">기수 목록을 조회하고 생성/수정/삭제합니다.</p>
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="generations-error">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="generations-success">
          {successMessage}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">목록</h2>
            <button
              type="button"
              onClick={() => void loadItems()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="generations-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500" data-testid="generations-loading">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2" data-testid="generations-list">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`generation-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">sortOrder: {item.sortOrder}</p>
                      <p className="text-xs text-gray-500">start: {formatTimestamp(item.startDate)}</p>
                      <p className="text-xs text-gray-500">end: {formatTimestamp(item.endDate)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        selectedId === item.id
                          ? "bg-black text-white"
                          : "border border-gray-300 text-gray-700"
                      }`}
                      data-testid={`generation-select-${item.id}`}
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
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="generation-create-form">
            <h2 className="mb-3 text-lg font-semibold">생성</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-gray-700">name</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="generation-create-name"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-gray-700">sortOrder</span>
                <input
                  type="number"
                  min={0}
                  value={createForm.sortOrder}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, sortOrder: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="generation-create-sort-order"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-gray-700">startDate</span>
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, startDate: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="generation-create-start-date"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-gray-700">endDate</span>
                <input
                  type="date"
                  value={createForm.endDate}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, endDate: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="generation-create-end-date"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="generation-create-submit"
            >
              생성
            </button>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="generation-edit-form">
            <h2 className="mb-3 text-lg font-semibold">수정/삭제</h2>
            {selected ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-700">name</span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, name: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="generation-edit-name"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-700">sortOrder</span>
                    <input
                      type="number"
                      min={0}
                      value={editForm.sortOrder}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, sortOrder: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="generation-edit-sort-order"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-700">startDate</span>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, startDate: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="generation-edit-start-date"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-700">endDate</span>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, endDate: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="generation-edit-end-date"
                    />
                  </label>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    data-testid="generation-edit-submit"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                    data-testid="generation-delete-button"
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 항목을 먼저 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>

      <section
        className="grid gap-6 lg:grid-cols-2"
        data-testid="generation-members-panel"
      >
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">현재 기수 멤버</h2>
          {!selected ? (
            <p className="text-sm text-gray-500">기수를 먼저 선택해 주세요.</p>
          ) : selectedMembers.length === 0 ? (
            <p className="text-sm text-gray-500" data-testid="generation-members-empty">
              배정된 멤버가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="generation-members-list">
              {selectedMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-2"
                  data-testid={`generation-member-row-${member.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleUnassignMember(member.id)}
                    disabled={isSubmitting}
                    className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 disabled:opacity-50"
                    data-testid={`generation-member-unassign-${member.id}`}
                  >
                    해제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">멤버 배정</h2>
          {!selected ? (
            <p className="text-sm text-gray-500">기수를 먼저 선택해 주세요.</p>
          ) : assignableUsers.length === 0 ? (
            <p className="text-sm text-gray-500" data-testid="generation-assignable-empty">
              배정 가능한 멤버가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="generation-assignable-list">
              {assignableUsers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-2"
                  data-testid={`generation-assignable-row-${member.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {member.email} / role: {member.role ?? "null"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAssignMember(member.id)}
                    disabled={isSubmitting}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                    data-testid={`generation-member-assign-${member.id}`}
                  >
                    배정
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
