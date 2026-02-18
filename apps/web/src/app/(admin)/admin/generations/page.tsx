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
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminDrawer from "../components/admin-drawer";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import { useAdminDrawerQuerySync } from "../components/use-admin-drawer-query-sync";

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
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createForm, setCreateForm] = useState<GenerationFormState>(emptyForm);
  const [editForm, setEditForm] = useState<GenerationFormState>(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<"create" | "delete" | null>(
    null,
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { queryState, setDrawerQuery, normalizeDrawerQuery } = useAdminDrawerQuerySync();

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

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        String(item.sortOrder).includes(query)
      );
    });
  }, [items, searchQuery]);

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

  const loadItems = async (preferredSelectedId?: string | null) => {
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
        if (panelMode === "edit") {
          setPanelMode(null);
        }
        return;
      }

      const fallbackId = generationData[0]?.id ?? null;
      const nextSelectedId =
        preferredSelectedId ??
        (selectedId && generationData.some((item) => item.id === selectedId)
          ? selectedId
          : null) ??
        fallbackId;

      setSelectedId(nextSelectedId);
      const selectedItem =
        generationData.find((item) => item.id === nextSelectedId) ?? null;
      syncEditForm(selectedItem);
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

  useEffect(() => {
    normalizeDrawerQuery();
  }, [normalizeDrawerQuery]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (queryState.panel === "create") {
      if (panelMode !== "create") {
        setCreateForm(emptyForm);
        setPanelMode("create");
        setErrorMessage(null);
        setSuccessMessage(null);
      }
      return;
    }

    if (queryState.panel === "edit") {
      const target = items.find((item) => item.id === queryState.id) ?? null;
      if (!target) {
        setDrawerQuery(null);
        return;
      }

      if (selectedId !== target.id) {
        setSelectedId(target.id);
        syncEditForm(target);
      }

      if (panelMode !== "edit") {
        setPanelMode("edit");
        setErrorMessage(null);
        setSuccessMessage(null);
      }
      return;
    }

    if (panelMode !== null) {
      setPanelMode(null);
    }
  }, [isLoading, items, panelMode, queryState, selectedId, setDrawerQuery]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setActiveSubmitAction("create");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminResourceApi.createGeneration({
        name: createForm.name.trim(),
        sortOrder: toPositiveInteger(createForm.sortOrder, "sortOrder"),
        startDate: toTimestampMs(createForm.startDate),
        endDate: toTimestampMs(createForm.endDate),
      });

      setCreateForm(emptyForm);
      setSuccessMessage("기수를 생성했습니다.");
      setPanelMode("edit");
      setDrawerQuery("edit", created.id);
      await loadItems(created.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
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
      await loadItems(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleDelete = async () => {
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("delete");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteGeneration(selected.id);
      setSuccessMessage("기수를 삭제했습니다.");
      setDeleteModalOpen(false);
      setPanelMode(null);
      setDrawerQuery(null);
      await loadItems();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleSelect = (item: ApiGeneration) => {
    setSelectedId(item.id);
    syncEditForm(item);
    setPanelMode("edit");
    setDrawerQuery("edit", item.id);
    setErrorMessage(null);
    setSuccessMessage(null);
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
      await loadItems(selected.id);
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
      await loadItems(selected?.id ?? null);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="generations-page">
      <AdminPageHeader
        title="기수 관리"
        description="운영 기간별 기수를 만들고 수정해, 멤버 분류 기준을 정리하는 화면입니다."
        guidance="목록에서 항목을 선택해 수정 패널을 열거나, 신규 버튼으로 새 기수를 등록하세요."
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AdminActionButton
            onClick={() => {
              setCreateForm(emptyForm);
              setPanelMode("create");
              setDrawerQuery("create");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            testId="generation-open-create"
          >
            + 신규 기수
          </AdminActionButton>
          <button
            type="button"
            onClick={() => void loadItems()}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="generations-reload-button"
          >
            새로고침
          </button>
        </div>
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        기수 생성/수정은 오른쪽 패널에서 처리하고, 멤버 배정은 선택된 기수 기준으로 같은 패널에서 바로 관리할 수 있습니다.
      </AdminInfoBox>

      {errorMessage ? (
        <p
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="generations-error"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700"
          data-testid="generations-success"
        >
          {successMessage}
        </p>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">현재 기수 목록</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="기수명/표시 순서 검색"
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="generation-search-input"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500" data-testid="generations-loading">
            불러오는 중...
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? "아직 등록된 기수가 없습니다."
              : "검색 조건에 맞는 기수가 없습니다."}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="generations-list">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-gray-200 p-3"
                data-testid={`generation-row-${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">표시 순서: {item.sortOrder}</p>
                    <p className="text-xs text-gray-500">시작일: {formatTimestamp(item.startDate)}</p>
                    <p className="text-xs text-gray-500">종료일: {formatTimestamp(item.endDate)}</p>
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
      </section>

      <AdminDrawer
        open={panelMode !== null}
        title={panelMode === "create" ? "기수 만들기" : "기수 수정"}
        description={
          panelMode === "create"
            ? "기수 기본 정보를 입력해 생성합니다."
            : selected
              ? `"${selected.name}" 기수를 수정합니다.`
              : "수정할 기수를 선택해 주세요."
        }
        onClose={() => {
          if (!isSubmitting) {
            setPanelMode(null);
            setDrawerQuery(null);
          }
        }}
        testId="generation-drawer"
      >
        {panelMode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-3" data-testid="generation-create-form">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-700">기수 이름</span>
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
              <span className="mb-1 block text-gray-700">표시 순서 (작을수록 먼저 보여요)</span>
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
              <span className="mb-1 block text-gray-700">시작일</span>
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
              <span className="mb-1 block text-gray-700">종료일</span>
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

            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "create"}
              disabled={isSubmitting && activeSubmitAction !== "create"}
              loadingText="기수 생성 중..."
              className="mt-2"
              testId="generation-create-submit"
            >
              기수 생성
            </AdminActionButton>
          </form>
        ) : selected ? (
          <div className="space-y-5">
            <form onSubmit={handleUpdate} className="space-y-3" data-testid="generation-edit-form">
              <label className="block text-sm">
                <span className="mb-1 block text-gray-700">기수 이름</span>
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
                <span className="mb-1 block text-gray-700">표시 순서</span>
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
                <span className="mb-1 block text-gray-700">시작일</span>
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
                <span className="mb-1 block text-gray-700">종료일</span>
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

              <div className="mt-2 flex gap-2">
                <AdminActionButton type="submit" disabled={isSubmitting} testId="generation-edit-submit">
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
                  loadingText="기수 삭제 중..."
                  testId="generation-delete-button"
                >
                  기수 삭제
                </AdminActionButton>
              </div>
            </form>

            <section className="space-y-4" data-testid="generation-members-panel">
              <article className="rounded-lg border border-gray-200 p-3">
                <h3 className="mb-2 text-sm font-semibold">현재 기수 멤버</h3>
                {selectedMembers.length === 0 ? (
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

              <article className="rounded-lg border border-gray-200 p-3">
                <h3 className="mb-2 text-sm font-semibold">멤버 배정</h3>
                {assignableUsers.length === 0 ? (
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
                            {member.email} / 권한: {member.role ?? "미지정"}
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
        ) : (
          <p className="text-sm text-gray-500">수정할 항목을 먼저 선택해 주세요.</p>
        )}
      </AdminDrawer>

      <AdminConfirmModal
        open={deleteModalOpen}
        title="기수를 삭제할까요?"
        description={
          selected
            ? `"${selected.name}" 기수를 삭제하면 연결된 설정을 다시 확인해야 합니다.`
            : "선택한 기수를 삭제합니다."
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
