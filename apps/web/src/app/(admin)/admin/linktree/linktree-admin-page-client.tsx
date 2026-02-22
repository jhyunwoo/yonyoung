"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import type {
  ApiLinktree,
  ApiLinktreeItem,
} from "../../../../lib/admin-api/types";
import { readErrorMessage } from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminDrawer from "../components/admin-drawer";
import {
  type AdminEntityRouteMode,
  buildAdminEntityRoute,
} from "../components/admin-entity-route";
import { AdminStatusMessage, AdminTextInput } from "../components/admin-form-controls";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";

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
  basePath?: string;
  routeId?: string | null;
  routeMode?: AdminEntityRouteMode;
  initialData?: {
    linktrees: ApiLinktree[];
  };
};

export default function LinktreeAdminPage({
  generationSortOrder = null,
  basePath = "/admin/linktree",
  routeId = null,
  routeMode = "list",
  initialData,
}: LinktreeAdminPageProps = {}) {
  const router = useRouter();
  const [items, setItems] = useState<ApiLinktree[]>(
    initialData?.linktrees ?? [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createForm, setCreateForm] =
    useState<LinktreeFormState>(emptyLinktreeForm);
  const [editForm, setEditForm] =
    useState<LinktreeFormState>(emptyLinktreeForm);
  const [itemCreateForm, setItemCreateForm] =
    useState<LinktreeItemFormState>(emptyItemForm);
  const [itemEditForm, setItemEditForm] =
    useState<LinktreeItemFormState>(emptyItemForm);

  const [isLoading, setIsLoading] = useState(() => !initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "createLinktree" | "deleteLinktree" | "createItem" | "deleteItem" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<"linktree" | "item" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDetailRoute = routeMode === "detail";
  const isStandaloneRoute = routeMode === "detail" || routeMode === "edit";

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedItem = useMemo(
    () => selected?.items.find((item) => item.id === selectedItemId) ?? null,
    [selected, selectedItemId],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) => {
      return item.name.toLowerCase().includes(query);
    });
  }, [items, searchQuery]);

  const syncEditForm = (item: ApiLinktree | null) => {
    if (!item) {
      setEditForm(emptyLinktreeForm);
      setSelectedItemId(null);
      setItemEditForm(emptyItemForm);
      return;
    }

    setEditForm({ name: item.name });
    const firstItem = item.items[0] ?? null;
    setSelectedItemId(firstItem?.id ?? null);
    setItemEditForm(
      firstItem
        ? {
            name: firstItem.name,
            link: firstItem.link,
          }
        : emptyItemForm,
    );
  };

  const applyLoadedData = (
    data: ApiLinktree[],
    preferredSelectedId?: string | null,
  ) => {
    setItems(data);

    if (data.length === 0) {
      setSelectedId(null);
      syncEditForm(null);
      if (panelMode === "edit") {
        setPanelMode(null);
      }
      return;
    }

    const fallbackId = data[0]?.id ?? null;
    const nextSelectedId =
      preferredSelectedId ??
      (selectedId && data.some((item) => item.id === selectedId)
        ? selectedId
        : null) ??
      fallbackId;

    setSelectedId(nextSelectedId);
    syncEditForm(data.find((item) => item.id === nextSelectedId) ?? null);
  };

  const loadData = async (preferredSelectedId?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await adminResourceApi.listLinktrees();
      applyLoadedData(data, preferredSelectedId);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      applyLoadedData(initialData.linktrees);
      setIsLoading(false);
      return;
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (routeMode === "create") {
      if (panelMode !== "create") {
        setCreateForm(emptyLinktreeForm);
        setPanelMode("create");
        setErrorMessage(null);
        setSuccessMessage(null);
      }
      return;
    }

    if (routeMode === "detail" || routeMode === "edit") {
      const target = items.find((item) => item.id === routeId) ?? null;
      if (!target) {
        router.replace(buildAdminEntityRoute(basePath, "list"), {
          scroll: false,
        });
        return;
      }

      if (selectedId !== target.id || panelMode !== "edit") {
        handleSelectLinktree(target, false);
      }
      return;
    }

    if (panelMode !== null) {
      setPanelMode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routeMode,
    routeId,
    isLoading,
    panelMode,
    items,
    selectedId,
    router,
    basePath,
  ]);

  const handleSelectLinktree = (item: ApiLinktree, navigate = true) => {
    setSelectedId(item.id);
    syncEditForm(item);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (navigate) {
      router.push(buildAdminEntityRoute(basePath, "detail", item.id), {
        scroll: false,
      });
    }
  };

  const handleNavigateBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(buildAdminEntityRoute(basePath, "list"), { scroll: false });
  };

  const handleSelectItem = (item: ApiLinktreeItem) => {
    setSelectedItemId(item.id);
    setItemEditForm({
      name: item.name,
      link: item.link,
    });
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setActiveSubmitAction("createLinktree");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminResourceApi.createLinktree({
        name: createForm.name.trim(),
      });

      setCreateForm(emptyLinktreeForm);
      setSuccessMessage("링크트리를 생성했습니다.");
      await loadData(created.id);
      router.replace(buildAdminEntityRoute(basePath, "detail", created.id), {
        scroll: false,
      });
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
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
      await loadData(selected.id);
      if (routeMode === "edit") {
        router.replace(buildAdminEntityRoute(basePath, "detail", selected.id), {
          scroll: false,
        });
      }
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
    setActiveSubmitAction("deleteLinktree");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteLinktree(selected.id);
      setSuccessMessage("링크트리를 삭제했습니다.");
      setDeleteTarget(null);
      setPanelMode(null);
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

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("createItem");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.addLinktreeItem(selected.id, {
        name: itemCreateForm.name.trim(),
        link: itemCreateForm.link.trim(),
      });

      setItemCreateForm(emptyItemForm);
      setSuccessMessage("링크 아이템을 추가했습니다.");
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
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
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleDeleteItem = async () => {
    if (!selected || !selectedItem) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("deleteItem");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteLinktreeItem(selected.id, selectedItem.id);
      setSuccessMessage("링크 아이템을 삭제했습니다.");
      setDeleteTarget(null);
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="linktree-page">
      <AdminPageHeader
        title="링크 모음 관리"
        description="대외 링크 묶음을 만들고, 각 묶음에 개별 링크를 추가하는 화면입니다."
        guidance="목록에서 링크 모음을 선택해 상세 페이지로 이동한 뒤 수정 페이지에서 링크 모음과 아이템을 편집하세요."
      >
        {isStandaloneRoute ? (
          <div className="mt-3 flex items-center">
            <AdminActionButton
              variant="ghost"
              onClick={handleNavigateBack}
              testId="linktree-route-back"
            >
              ← 이전 페이지
            </AdminActionButton>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminActionButton
              onClick={() => {
                router.push(buildAdminEntityRoute(basePath, "create"), {
                  scroll: false,
                });
              }}
              testId="linktree-open-create"
            >
              + 신규 링크 모음
            </AdminActionButton>
            <AdminActionButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadData()}
              data-testid="linktree-reload-button"
            >
              새로고침
            </AdminActionButton>
            {generationSortOrder !== null ? (
              <p
                className="text-xs text-gray-500"
                data-testid="linktree-global-note"
              >
                공통 설정: 선택한 {generationSortOrder}기와 관계없이 전체에
                적용됩니다.
              </p>
            ) : null}
          </div>
        )}
      </AdminPageHeader>

      {!isStandaloneRoute ? (
        <AdminInfoBox title="작업 안내">
          링크 모음을 먼저 만든 뒤 하위 링크 아이템을 추가하세요. 상세
          페이지에서 수정 페이지로 이동해 링크 모음과 아이템을 함께 편집할 수
          있습니다.
        </AdminInfoBox>
      ) : null}

      {errorMessage ? (
        <AdminStatusMessage tone="error" testId="linktree-error">
          {errorMessage}
        </AdminStatusMessage>
      ) : null}

      {successMessage ? (
        <AdminStatusMessage tone="success" testId="linktree-success">
          {successMessage}
        </AdminStatusMessage>
      ) : null}

      {!isStandaloneRoute ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">링크 모음 목록</h2>
            <AdminTextInput
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="링크 모음 검색"
              className="max-w-xs"
              data-testid="linktree-search-input"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              {items.length === 0
                ? "아직 등록된 링크 모음이 없습니다."
                : "검색 조건에 맞는 링크 모음이 없습니다."}
            </p>
          ) : (
            <ul
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="linktree-list"
            >
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-gray-200 p-3"
                  data-testid={`linktree-row-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectLinktree(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        포함 링크 수: {item.items.length}
                      </p>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <AdminDrawer
        open={panelMode !== null}
        title={panelMode === "create" ? "링크 모음 만들기" : "링크 모음 수정"}
        description={
          panelMode === "create"
            ? "링크 모음 이름을 입력해 새 그룹을 만듭니다."
            : selected
              ? `"${selected.name}" 링크 모음을 편집합니다.`
              : "수정할 링크 모음을 선택해 주세요."
        }
        onClose={() => {
          if (!isSubmitting) {
            setPanelMode(null);
            router.push(buildAdminEntityRoute(basePath, "list"), {
              scroll: false,
            });
          }
        }}
        testId="linktree-drawer"
        variant="page"
        showCloseButton={!isStandaloneRoute}
      >
        {panelMode === "create" ? (
          <form
            onSubmit={handleCreate}
            className="space-y-3"
            data-testid="linktree-create-form"
          >
            <label className="block text-sm">
              <span className="mb-1 block">링크 모음 이름</span>
              <AdminTextInput
                type="text"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                className="w-full"
                required
                data-testid="linktree-create-name"
              />
            </label>
            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "createLinktree"}
              disabled={isSubmitting && activeSubmitAction !== "createLinktree"}
              loadingText="링크 모음 생성 중..."
              className="mt-2"
              testId="linktree-create-submit"
            >
              링크 모음 생성
            </AdminActionButton>
          </form>
        ) : selected && isDetailRoute ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {selected.name}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                포함 링크 수: {selected.items.length}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                {selected.items.map((item) => (
                  <li key={item.id}>
                    {item.name}: {item.link}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminActionButton
                onClick={() =>
                  router.push(
                    buildAdminEntityRoute(basePath, "edit", selected.id),
                    {
                      scroll: false,
                    },
                  )
                }
                testId="linktree-open-edit"
              >
                수정 페이지로 이동
              </AdminActionButton>
            </div>
          </div>
        ) : selected ? (
          <div className="space-y-5">
            <form
              onSubmit={handleUpdate}
              className="space-y-3"
              data-testid="linktree-edit-form"
            >
              <label className="block text-sm">
                <span className="mb-1 block">링크 모음 이름</span>
                <AdminTextInput
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  className="w-full"
                  required
                  data-testid="linktree-edit-name"
                />
              </label>
              <div className="mt-2 flex gap-2">
                <AdminActionButton
                  type="submit"
                  disabled={isSubmitting}
                  testId="linktree-edit-submit"
                >
                  수정 저장
                </AdminActionButton>
                <AdminActionButton
                  variant="danger"
                  onClick={() => {
                    if (!isSubmitting) {
                      setDeleteTarget("linktree");
                    }
                  }}
                  disabled={isSubmitting}
                  testId="linktree-delete-button"
                >
                  링크 모음 삭제
                </AdminActionButton>
              </div>
            </form>

            <section className="space-y-4">
              <form
                onSubmit={handleCreateItem}
                className="rounded-lg border border-gray-200 p-3"
                data-testid="linktree-item-create-form"
              >
                <h3 className="mb-2 text-sm font-semibold">링크 아이템 추가</h3>
                <div className="space-y-2">
                  <label className="block text-sm">
                    <span className="mb-1 block">링크 이름</span>
                    <AdminTextInput
                      type="text"
                      value={itemCreateForm.name}
                      onChange={(event) =>
                        setItemCreateForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      className="w-full"
                      required
                      data-testid="linktree-item-create-name"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block">이동 주소(URL)</span>
                    <AdminTextInput
                      type="url"
                      value={itemCreateForm.link}
                      onChange={(event) =>
                        setItemCreateForm((previous) => ({
                          ...previous,
                          link: event.target.value,
                        }))
                      }
                      className="w-full"
                      required
                      data-testid="linktree-item-create-link"
                    />
                  </label>
                  <AdminActionButton
                    type="submit"
                    loading={activeSubmitAction === "createItem"}
                    disabled={
                      isSubmitting && activeSubmitAction !== "createItem"
                    }
                    loadingText="링크 추가 중..."
                    testId="linktree-item-create-submit"
                  >
                    링크 추가
                  </AdminActionButton>
                </div>
              </form>

              <article
                className="rounded-lg border border-gray-200 p-3"
                data-testid="linktree-item-edit-card"
              >
                <h3 className="mb-2 text-sm font-semibold">
                  선택 링크 아이템 수정/삭제
                </h3>
                {selected.items.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    등록된 링크 아이템이 없습니다.
                  </p>
                ) : (
                  <ul
                    className="mb-3 space-y-2"
                    data-testid="linktree-item-list"
                  >
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-md border border-gray-200 p-2"
                        data-testid={`linktree-item-row-${item.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectItem(item)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="truncate text-xs text-gray-500">
                              {item.link}
                            </p>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={handleUpdateItem}
                  className="space-y-2"
                  data-testid="linktree-item-edit-form"
                >
                  {selectedItem ? (
                    <>
                      <label className="block text-sm">
                        <span className="mb-1 block">링크 이름</span>
                        <AdminTextInput
                          type="text"
                          value={itemEditForm.name}
                          onChange={(event) =>
                            setItemEditForm((previous) => ({
                              ...previous,
                              name: event.target.value,
                            }))
                          }
                          className="w-full"
                          required
                          data-testid="linktree-item-edit-name"
                        />
                      </label>

                      <label className="block text-sm">
                        <span className="mb-1 block">이동 주소(URL)</span>
                        <AdminTextInput
                          type="url"
                          value={itemEditForm.link}
                          onChange={(event) =>
                            setItemEditForm((previous) => ({
                              ...previous,
                              link: event.target.value,
                            }))
                          }
                          className="w-full"
                          required
                          data-testid="linktree-item-edit-link"
                        />
                      </label>

                      <div className="flex gap-2">
                        <AdminActionButton
                          type="submit"
                          disabled={isSubmitting}
                          testId="linktree-item-edit-submit"
                        >
                          수정 저장
                        </AdminActionButton>
                        <AdminActionButton
                          variant="danger"
                          onClick={() => {
                            if (!isSubmitting) {
                              setDeleteTarget("item");
                            }
                          }}
                          disabled={isSubmitting}
                          testId="linktree-item-delete-button"
                        >
                          링크 삭제
                        </AdminActionButton>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">
                      수정할 링크 아이템을 선택해 주세요.
                    </p>
                  )}
                </form>
              </article>
            </section>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            수정할 링크 모음을 선택해 주세요.
          </p>
        )}
      </AdminDrawer>

      <AdminConfirmModal
        open={deleteTarget !== null}
        title={
          deleteTarget === "item"
            ? "링크를 삭제할까요?"
            : "링크 모음을 삭제할까요?"
        }
        description={
          deleteTarget === "item"
            ? selectedItem
              ? `"${selectedItem.name}" 링크가 목록에서 제거됩니다.`
              : "선택한 링크를 삭제합니다."
            : selected
              ? `"${selected.name}" 링크 모음과 포함된 링크가 함께 삭제됩니다.`
              : "선택한 링크 모음을 삭제합니다."
        }
        confirmText="삭제하기"
        confirmLoadingText="삭제 중..."
        isLoading={
          activeSubmitAction === "deleteLinktree" ||
          activeSubmitAction === "deleteItem"
        }
        onConfirm={() => {
          if (deleteTarget === "item") {
            void handleDeleteItem();
            return;
          }
          void handleDelete();
        }}
        onClose={() => {
          if (!isSubmitting) {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
