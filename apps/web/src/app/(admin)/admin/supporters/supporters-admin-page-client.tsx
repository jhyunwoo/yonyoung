"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import type { ApiSupporter } from "../../../../lib/admin-api/types";
import {
  formatTimestamp,
  readErrorMessage,
  toDateInputValue,
  toTimestampMs,
} from "../components/admin-form-utils";
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
import ImageInput from "../components/image-input";
import { useImmediateImageUpload } from "../components/use-immediate-image-upload";

type SupporterFormState = {
  name: string;
  link: string;
  expiresAt: string;
};

const emptyForm: SupporterFormState = {
  name: "",
  link: "",
  expiresAt: "",
};

type SupportersAdminPageProps = {
  generationSortOrder?: number | null;
  basePath?: string;
  routeId?: string | null;
  routeMode?: AdminEntityRouteMode;
  initialData?: {
    supporters: ApiSupporter[];
  };
};

export default function SupportersAdminPage({
  generationSortOrder = null,
  basePath = "/admin/supporters",
  routeId = null,
  routeMode = "list",
  initialData,
}: SupportersAdminPageProps = {}) {
  const router = useRouter();
  const [items, setItems] = useState<ApiSupporter[]>(
    initialData?.supporters ?? [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createForm, setCreateForm] = useState<SupporterFormState>(emptyForm);
  const [editForm, setEditForm] = useState<SupporterFormState>(emptyForm);

  const createUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.supporterLogo,
  });
  const editUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.supporterLogo,
  });

  const [isLoading, setIsLoading] = useState(() => !initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "create" | "delete" | null
  >(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDetailRoute = routeMode === "detail";
  const isStandaloneRoute = routeMode === "detail" || routeMode === "edit";

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) => {
      return (
        item.name.toLowerCase().includes(query) ||
        item.link.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const syncEditForm = (item: ApiSupporter | null) => {
    if (!item) {
      setEditForm(emptyForm);
      editUpload.reset(null);
      return;
    }

    setEditForm({
      name: item.name,
      link: item.link,
      expiresAt: toDateInputValue(item.expiresAt),
    });
    editUpload.reset(item.logoUrl);
  };

  const applyLoadedData = (
    data: ApiSupporter[],
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
    const candidateSelectedId =
      preferredSelectedId ??
      (selectedId && data.some((item) => item.id === selectedId)
        ? selectedId
        : null) ??
      fallbackId;

    setSelectedId(candidateSelectedId);
    const selectedItem =
      data.find((item) => item.id === candidateSelectedId) ?? null;
    syncEditForm(selectedItem);
  };

  const loadData = async (preferredSelectedId?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await adminResourceApi.listSupporters();
      applyLoadedData(data, preferredSelectedId);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      applyLoadedData(initialData.supporters);
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
        setCreateForm(emptyForm);
        createUpload.reset(null);
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

  const handleSelect = (item: ApiSupporter) => {
    setSelectedId(item.id);
    syncEditForm(item);
    setErrorMessage(null);
    setSuccessMessage(null);
    router.push(buildAdminEntityRoute(basePath, "detail", item.id), {
      scroll: false,
    });
  };

  const handleNavigateBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(buildAdminEntityRoute(basePath, "list"), { scroll: false });
  };

  const openCreatePanel = () =>
    router.push(buildAdminEntityRoute(basePath, "create"), { scroll: false });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createUpload.isUploading || createUpload.hasUploadError) {
      return;
    }
    if (!createUpload.currentUrl) {
      setErrorMessage("후원사 로고 업로드를 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("create");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminResourceApi.createSupporter({
        name: createForm.name.trim(),
        link: createForm.link.trim(),
        logoUrl: createUpload.currentUrl,
        expiresAt: toTimestampMs(createForm.expiresAt),
      });

      setCreateForm(emptyForm);
      createUpload.reset(null);
      setSelectedId(created.id);
      setSuccessMessage("후원사를 생성했습니다.");
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
    if (editUpload.isUploading || editUpload.hasUploadError) {
      return;
    }
    if (!editUpload.currentUrl) {
      setErrorMessage("후원사 로고 업로드를 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateSupporter(selected.id, {
        name: editForm.name.trim(),
        link: editForm.link.trim(),
        logoUrl: editUpload.currentUrl,
        expiresAt: toTimestampMs(editForm.expiresAt),
      });

      setSuccessMessage("후원사를 수정했습니다.");
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
      await adminResourceApi.deleteSupporter(selected.id);
      setSuccessMessage("후원사를 삭제했습니다.");
      setDeleteModalOpen(false);
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

  const canSubmitCreate =
    !isSubmitting &&
    !createUpload.isUploading &&
    !createUpload.hasUploadError &&
    Boolean(createUpload.currentUrl);

  const canSubmitEdit =
    !isSubmitting &&
    !editUpload.isUploading &&
    !editUpload.hasUploadError &&
    Boolean(editUpload.currentUrl);

  return (
    <div className="space-y-6" data-testid="supporters-page">
      <AdminPageHeader
        title="후원사 관리"
        description="홈페이지에 노출할 후원사 정보를 등록하고 수정하는 화면입니다."
        guidance="목록에서 항목을 선택해 상세 페이지로 이동하고, 상세 페이지에서 수정 페이지로 이동해 편집하세요."
      >
        {isStandaloneRoute ? (
          <div className="mt-3 flex items-center">
            <AdminActionButton
              variant="ghost"
              onClick={handleNavigateBack}
              testId="supporter-route-back"
            >
              ← 이전 페이지
            </AdminActionButton>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminActionButton
              onClick={openCreatePanel}
              testId="supporter-open-create"
            >
              + 신규 후원사
            </AdminActionButton>
            <AdminActionButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadData()}
              data-testid="supporters-reload-button"
            >
              새로고침
            </AdminActionButton>
            {generationSortOrder !== null ? (
              <p
                className="text-xs text-gray-500"
                data-testid="supporters-global-note"
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
          로고는 파일 선택 즉시 업로드됩니다. 저장 버튼은 업로드 완료 이후에만
          활성화됩니다.
        </AdminInfoBox>
      ) : null}

      {errorMessage ? (
        <AdminStatusMessage tone="error" testId="supporters-error">
          {errorMessage}
        </AdminStatusMessage>
      ) : null}

      {successMessage ? (
        <AdminStatusMessage tone="success" testId="supporters-success">
          {successMessage}
        </AdminStatusMessage>
      ) : null}

      {!isStandaloneRoute ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">등록된 후원사 목록</h2>
            <AdminTextInput
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="이름/링크 검색"
              className="max-w-xs"
              data-testid="supporter-search-input"
            />
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              {items.length === 0
                ? "아직 등록된 후원사가 없습니다."
                : "검색 조건에 맞는 후원사가 없습니다."}
            </p>
          ) : (
            <ul
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              data-testid="supporters-list"
            >
              {filteredItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-gray-200 p-3"
                  data-testid={`supporter-row-${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-medium">{item.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        링크: {item.link}
                      </p>
                      <p className="text-xs text-gray-500">
                        노출 종료일: {formatTimestamp(item.expiresAt)}
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
        title={panelMode === "create" ? "후원사 추가" : "후원사 수정"}
        description={
          panelMode === "create"
            ? "필수 정보를 입력하고 저장하세요."
            : selected
              ? `"${selected.name}" 정보를 수정합니다.`
              : "수정할 후원사를 선택해 주세요."
        }
        onClose={() => {
          if (isSubmitting) {
            return;
          }
          setPanelMode(null);
          router.push(buildAdminEntityRoute(basePath, "list"), {
            scroll: false,
          });
        }}
        testId="supporter-drawer"
        variant="page"
        showCloseButton={!isStandaloneRoute}
      >
        {panelMode === "create" ? (
          <form
            onSubmit={handleCreate}
            className="space-y-3"
            data-testid="supporter-create-form"
          >
            <label className="block text-sm">
              <span className="mb-1 block">후원사 이름</span>
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
                data-testid="supporter-create-name"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">연결 링크</span>
              <AdminTextInput
                type="url"
                value={createForm.link}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    link: event.target.value,
                  }))
                }
                className="w-full"
                required
                data-testid="supporter-create-link"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">노출 종료일</span>
              <AdminTextInput
                type="date"
                value={createForm.expiresAt}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    expiresAt: event.target.value,
                  }))
                }
                className="w-full"
                required
                data-testid="supporter-create-expires-at"
              />
            </label>

            <ImageInput
              label="후원사 로고"
              file={createUpload.file}
              onFileChange={createUpload.selectFile}
              currentUrl={createUpload.currentUrl}
              status={createUpload.status}
              errorMessage={createUpload.errorMessage}
              onRetry={createUpload.retry}
              uploadProgress={createUpload.progress}
              isUploading={createUpload.isUploading}
              previewAspectRatio="3/2"
              testIdPrefix="supporter-create-logo"
              disabled={isSubmitting}
            />

            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "create"}
              disabled={!canSubmitCreate}
              loadingText="후원사 추가 중..."
              className="mt-2"
              testId="supporter-create-submit"
            >
              후원사 추가
            </AdminActionButton>
          </form>
        ) : selected && isDetailRoute ? (
          <div className="space-y-4">
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
                testId="supporter-open-edit"
              >
                수정 페이지로 이동
              </AdminActionButton>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {selected.name}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                노출 종료일: {formatTimestamp(selected.expiresAt)}
              </p>
              <p className="mt-1 truncate text-sm text-gray-600">
                연결 링크: {selected.link}
              </p>
            </div>
          </div>
        ) : selected ? (
          <form
            onSubmit={handleUpdate}
            className="space-y-3"
            data-testid="supporter-edit-form"
          >
            <label className="block text-sm">
              <span className="mb-1 block">후원사 이름</span>
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
                data-testid="supporter-edit-name"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">연결 링크</span>
              <AdminTextInput
                type="url"
                value={editForm.link}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    link: event.target.value,
                  }))
                }
                className="w-full"
                required
                data-testid="supporter-edit-link"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">노출 종료일</span>
              <AdminTextInput
                type="date"
                value={editForm.expiresAt}
                onChange={(event) =>
                  setEditForm((previous) => ({
                    ...previous,
                    expiresAt: event.target.value,
                  }))
                }
                className="w-full"
                required
                data-testid="supporter-edit-expires-at"
              />
            </label>

            <ImageInput
              label="후원사 로고"
              file={editUpload.file}
              onFileChange={editUpload.selectFile}
              currentUrl={editUpload.currentUrl}
              status={editUpload.status}
              errorMessage={editUpload.errorMessage}
              onRetry={editUpload.retry}
              uploadProgress={editUpload.progress}
              isUploading={editUpload.isUploading}
              previewAspectRatio="3/2"
              testIdPrefix="supporter-edit-logo"
              disabled={isSubmitting}
            />

            <div className="mt-2 flex gap-2">
              <AdminActionButton
                type="submit"
                disabled={!canSubmitEdit}
                testId="supporter-edit-submit"
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
                loadingText="후원사 삭제 중..."
                testId="supporter-delete-button"
              >
                후원사 삭제
              </AdminActionButton>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500">
            수정할 후원사를 선택해 주세요.
          </p>
        )}
      </AdminDrawer>

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
