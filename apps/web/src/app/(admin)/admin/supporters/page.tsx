"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS, uploadWithPresign } from "../../../../lib/admin-api/upload";
import type { ApiSupporter } from "../../../../lib/admin-api/types";
import {
  formatTimestamp,
  readErrorMessage,
  toDateInputValue,
  toTimestampMs,
} from "../components/admin-form-utils";
import AdminActionButton from "../components/admin-action-button";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import ImageInput from "../components/image-input";

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

/**
 * SupportersAdminPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  generationSortOrder = null,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 리렌더링 타이밍에 따라 훅 의존성 배열을 신중히 관리해야 합니다.
 */
export default function SupportersAdminPage({
  generationSortOrder = null,
}: SupportersAdminPageProps = {}) {
  const [items, setItems] = useState<ApiSupporter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<SupporterFormState>(emptyForm);
  const [editForm, setEditForm] = useState<SupporterFormState>(emptyForm);

  const [createFile, setCreateFile] = useState<File | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [createLogoUploadProgress, setCreateLogoUploadProgress] = useState<number | null>(null);
  const [editLogoUploadProgress, setEditLogoUploadProgress] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "create" | "delete" | null
  >(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
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

    /**
   * syncEditForm의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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

    /**
   * loadData 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
   * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
          selectedId && data.some(/** data.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedId)
            ? selectedId
            : fallbackId;
        setSelectedId(nextSelectedId);
        syncEditForm(data.find(/** data.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === nextSelectedId) ?? null);
      }
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
   * handleSelect의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSelect = (item: ApiSupporter) => {
    setSelectedId(item.id);
    syncEditForm(item);
    setEditFile(null);
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
    setActiveSubmitAction("create");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!createFile) {
        throw new Error("후원사 로고 파일을 선택해 주세요.");
      }

      setCreateLogoUploadProgress(0);
      const logoUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.supporterLogo,
        file: createFile,
        onProgress: setCreateLogoUploadProgress,
      });

      await adminResourceApi.createSupporter({
        name: createForm.name.trim(),
        link: createForm.link.trim(),
        logoUrl,
        expiresAt: toTimestampMs(createForm.expiresAt),
      });

      setCreateForm(emptyForm);
      setCreateFile(null);
      setCreateLogoUploadProgress(null);
      setSuccessMessage("후원사를 생성했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setCreateLogoUploadProgress(null);
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
      const logoUrl = editFile
        ? await (async () => {
            setEditLogoUploadProgress(0);
            return uploadWithPresign({
              presignPath: PRESIGN_PATHS.supporterLogo,
              file: editFile,
              onProgress: setEditLogoUploadProgress,
            });
          })()
        : editForm.logoUrl;

      await adminResourceApi.updateSupporter(selected.id, {
        name: editForm.name.trim(),
        link: editForm.link.trim(),
        logoUrl,
        expiresAt: toTimestampMs(editForm.expiresAt),
      });

      setSuccessMessage("후원사를 수정했습니다.");
      setEditFile(null);
      setEditLogoUploadProgress(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setEditLogoUploadProgress(null);
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
    setActiveSubmitAction("delete");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteSupporter(selected.id);
      setSuccessMessage("후원사를 삭제했습니다.");
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
    if (!selected || isSubmitting) {
      return;
    }
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="supporters-page">
      <AdminPageHeader
        title="후원사 관리"
        description="홈페이지에 노출할 후원사 정보를 등록하고 수정하는 화면입니다."
        guidance="후원사 이름, 링크, 노출 종료일을 입력하면 자동으로 목록에 반영됩니다."
      >
        {generationSortOrder !== null ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="supporters-global-note">
            공통 설정: 선택한 {generationSortOrder}기와 관계없이 전체에 적용됩니다.
          </p>
        ) : null}
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        링크는 후원사 공식 페이지 주소를 넣어 주세요. 종료일이 지나면 자동으로 노출 대상에서 제외됩니다.
      </AdminInfoBox>

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
            <h2 className="text-lg font-semibold">등록된 후원사 목록</h2>
            <button
              type="button"
              onClick={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => void loadData()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="supporters-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">아직 등록된 후원사가 없습니다. 오른쪽에서 먼저 추가해 주세요.</p>
          ) : (
            <ul className="space-y-2" data-testid="supporters-list">
              {items.map(/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`supporter-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="truncate text-xs text-gray-500">링크: {item.link}</p>
                      <p className="text-xs text-gray-500">노출 종료일: {formatTimestamp(item.expiresAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => handleSelect(item)}
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
            <h2 className="mb-3 text-lg font-semibold">후원사 추가</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">후원사 이름</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="supporter-create-name"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">연결 링크</span>
                <input
                  type="url"
                  value={createForm.link}
                  onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, link: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="supporter-create-link"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">노출 종료일</span>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, expiresAt: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="supporter-create-expires-at"
                />
              </label>

              <ImageInput
                label="후원사 로고"
                file={createFile}
                onFileChange={setCreateFile}
                uploadProgress={createLogoUploadProgress}
                isUploading={createLogoUploadProgress !== null}
                testIdPrefix="supporter-create-logo"
                disabled={isSubmitting}
              />
            </div>

            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "create"}
              disabled={isSubmitting && activeSubmitAction !== "create"}
              loadingText="후원사 추가 중..."
              className="mt-4"
              testId="supporter-create-submit"
            >
              후원사 추가
            </AdminActionButton>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="supporter-edit-form">
            <h2 className="mb-3 text-lg font-semibold">선택한 후원사 수정/삭제</h2>
            {selected ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block">후원사 이름</span>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, name: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="supporter-edit-name"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">연결 링크</span>
                    <input
                      type="url"
                      value={editForm.link}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, link: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="supporter-edit-link"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">노출 종료일</span>
                    <input
                      type="date"
                      value={editForm.expiresAt}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, expiresAt: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="supporter-edit-expires-at"
                    />
                  </label>

                  <ImageInput
                    label="후원사 로고"
                    file={editFile}
                    onFileChange={setEditFile}
                    uploadProgress={editLogoUploadProgress}
                    isUploading={editLogoUploadProgress !== null}
                    testIdPrefix="supporter-edit-logo"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <AdminActionButton
                    type="submit"
                    disabled={isSubmitting}
                    testId="supporter-edit-submit"
                  >
                    수정 저장
                  </AdminActionButton>
                  <AdminActionButton
                    variant="danger"
                    onClick={openDeleteModal}
                    loading={activeSubmitAction === "delete"}
                    disabled={isSubmitting && activeSubmitAction !== "delete"}
                    loadingText="후원사 삭제 중..."
                    testId="supporter-delete-button"
                  >
                    후원사 삭제
                  </AdminActionButton>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 후원사를 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>

      <AdminConfirmModal
        open={deleteModalOpen}
        title="후원사를 삭제할까요?"
        description={
          selected
            ? `"${selected.name}" 정보를 삭제하면 페이지 노출에서 즉시 사라집니다.`
            : "선택한 후원사 정보를 삭제합니다."
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
