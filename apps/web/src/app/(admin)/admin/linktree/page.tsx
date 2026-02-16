"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import type { ApiLinktree, ApiLinktreeItem } from "../../../../lib/admin-api/types";
import { readErrorMessage } from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
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
};

/**
 * LinktreeAdminPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  generationSortOrder = null,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 리렌더링 타이밍에 따라 훅 의존성 배열을 신중히 관리해야 합니다.
 */
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
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "createLinktree" | "deleteLinktree" | "createItem" | "deleteItem" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<"linktree" | "item" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selected = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => items.find(/** items.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedItem = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => selected?.items.find(/** selected?.items.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedItemId) ?? null,
    [selected, selectedItemId],
  );

    /**
   * syncEditForm의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const syncEditForm = (item: ApiLinktree | null) => {
    if (!item) {
      setEditForm(emptyLinktreeForm);
      return;
    }

    setEditForm({
      name: item.name,
    });
  };

    /**
   * syncItemEditForm의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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

    /**
   * loadData 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
   * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
        selectedId && data.some(/** data.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedId)
          ? selectedId
          : fallbackId;
      setSelectedId(nextSelectedId);

      const selectedLinktree = data.find(/** data.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === nextSelectedId) ?? null;
      syncEditForm(selectedLinktree);

      const nextItemId =
        selectedItemId && selectedLinktree?.items.some(/** selectedLinktree?.items.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedItemId)
          ? selectedItemId
          : selectedLinktree?.items[0]?.id ?? null;
      setSelectedItemId(nextItemId);
      syncItemEditForm(
        nextItemId
          ? selectedLinktree?.items.find(/** selectedLinktree?.items.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === nextItemId) ?? null
          : null,
      );
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(/** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

    /**
   * handleSelectLinktree의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSelectLinktree = (item: ApiLinktree) => {
    setSelectedId(item.id);
    syncEditForm(item);
    const firstItem = item.items[0] ?? null;
    setSelectedItemId(firstItem?.id ?? null);
    syncItemEditForm(firstItem);
  };

    /**
   * handleSelectItem의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSelectItem = (item: ApiLinktreeItem) => {
    setSelectedItemId(item.id);
    syncItemEditForm(item);
  };

    /**
   * handleCreate의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setActiveSubmitAction("createLinktree");
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
      setActiveSubmitAction(null);
    }
  };

    /**
   * handleUpdate의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      setActiveSubmitAction(null);
    }
  };

    /**
   * handleDelete의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

    /**
   * handleCreateItem의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

    /**
   * handleUpdateItem의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      setActiveSubmitAction(null);
    }
  };

    /**
   * handleDeleteItem의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const openDeleteLinktreeModal = () => {
    if (!selected || isSubmitting) {
      return;
    }
    setDeleteTarget("linktree");
  };

  const openDeleteItemModal = () => {
    if (!selected || !selectedItem || isSubmitting) {
      return;
    }
    setDeleteTarget("item");
  };

  return (
    <div className="space-y-6" data-testid="linktree-page">
      <AdminPageHeader
        title="링크 모음 관리"
        description="대외 링크 묶음을 만들고, 각 묶음에 개별 링크를 추가하는 화면입니다."
        guidance="먼저 링크 모음을 만든 뒤, 아래에서 세부 링크 아이템을 추가해 주세요."
      >
        {generationSortOrder !== null ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="linktree-global-note">
            공통 설정: 선택한 {generationSortOrder}기와 관계없이 전체에 적용됩니다.
          </p>
        ) : null}
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        링크 모음은 메뉴 단위, 링크 아이템은 실제 이동 주소입니다. 이름은 사용자가 바로 이해할 수 있게 작성해 주세요.
      </AdminInfoBox>

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
            <h2 className="text-lg font-semibold">링크 모음 목록</h2>
            <button
              type="button"
              onClick={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => void loadData()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="linktree-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">아직 등록된 링크 모음이 없습니다. 오른쪽에서 먼저 만들어 주세요.</p>
          ) : (
            <ul className="space-y-2" data-testid="linktree-list">
              {items.map(/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`linktree-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">포함 링크 수: {item.items.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => handleSelectLinktree(item)}
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
            <h2 className="mb-3 text-lg font-semibold">링크 모음 만들기</h2>
            <label className="block text-sm">
              <span className="mb-1 block">링크 모음 이름</span>
              <input
                type="text"
                value={createForm.name}
                onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                  setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="linktree-create-name"
              />
            </label>
            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "createLinktree"}
              disabled={isSubmitting && activeSubmitAction !== "createLinktree"}
              loadingText="링크 모음 생성 중..."
              className="mt-4"
              testId="linktree-create-submit"
            >
              링크 모음 생성
            </AdminActionButton>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="linktree-edit-form">
            <h2 className="mb-3 text-lg font-semibold">선택한 링크 모음 수정/삭제</h2>
            {selected ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block">링크 모음 이름</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                      setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                    data-testid="linktree-edit-name"
                  />
                </label>
                <div className="mt-4 flex gap-2">
                  <AdminActionButton
                    type="submit"
                    disabled={isSubmitting}
                    testId="linktree-edit-submit"
                  >
                    수정 저장
                  </AdminActionButton>
                  <AdminActionButton
                    variant="danger"
                    onClick={openDeleteLinktreeModal}
                    disabled={isSubmitting}
                    testId="linktree-delete-button"
                  >
                    링크 모음 삭제
                  </AdminActionButton>
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
                <span className="mb-1 block">링크 이름</span>
                <input
                  type="text"
                  value={itemCreateForm.name}
                  onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setItemCreateForm(/** setItemCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="linktree-item-create-name"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">이동 주소(URL)</span>
                <input
                  type="url"
                  value={itemCreateForm.link}
                  onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setItemCreateForm(/** setItemCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, link: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="linktree-item-create-link"
                />
              </label>
              <AdminActionButton
                type="submit"
                loading={activeSubmitAction === "createItem"}
                disabled={isSubmitting && activeSubmitAction !== "createItem"}
                loadingText="링크 추가 중..."
                testId="linktree-item-create-submit"
              >
                링크 추가
              </AdminActionButton>
            </div>
          ) : (
            <p className="text-sm text-gray-500">링크트리를 먼저 선택해 주세요.</p>
          )}
        </form>

        <article className="rounded-lg border border-gray-200 bg-white p-4" data-testid="linktree-item-edit-card">
          <h2 className="mb-3 text-lg font-semibold">선택 링크 아이템 수정/삭제</h2>
          {selected ? (
            <>
              {selected.items.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 링크 아이템이 없습니다.</p>
              ) : (
                <ul className="mb-4 space-y-2" data-testid="linktree-item-list">
                  {selected.items.map(/** selected.items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => (
                    <li key={item.id} className="rounded-md border border-gray-200 p-2" data-testid={`linktree-item-row-${item.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-gray-500">{item.link}</p>
                        </div>
                        <button
                          type="button"
                          onClick={/** selected.items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => handleSelectItem(item)}
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
                      <span className="mb-1 block">링크 이름</span>
                      <input
                        type="text"
                        value={itemEditForm.name}
                        onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                          setItemEditForm(/** setItemEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="linktree-item-edit-name"
                      />
                    </label>

                    <label className="block text-sm">
                      <span className="mb-1 block">이동 주소(URL)</span>
                      <input
                        type="url"
                        value={itemEditForm.link}
                        onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                          setItemEditForm(/** setItemEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, link: event.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                        onClick={openDeleteItemModal}
                        disabled={isSubmitting}
                        testId="linktree-item-delete-button"
                      >
                        링크 삭제
                      </AdminActionButton>
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

      <AdminConfirmModal
        open={deleteTarget !== null}
        title={deleteTarget === "item" ? "링크를 삭제할까요?" : "링크 모음을 삭제할까요?"}
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
        onConfirm={/** onConfirm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
          if (deleteTarget === "item") {
            void handleDeleteItem();
            return;
          }
          void handleDelete();
        }}
        onClose={/** onClose 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
          if (isSubmitting) {
            return;
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
