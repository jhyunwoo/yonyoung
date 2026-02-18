"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS } from "../../../../lib/admin-api/upload";
import type {
  ApiActivity,
  ApiActivityImage,
  ApiGeneration,
} from "../../../../lib/admin-api/types";
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
import ImageInput from "../components/image-input";
import { useAdminDrawerQuerySync } from "../components/use-admin-drawer-query-sync";
import { useImmediateImageUpload } from "../components/use-immediate-image-upload";

type ActivityFormState = {
  title: string;
  description: string;
  activityDate: string;
  generationId: string;
};

type DetailImageFormState = {
  sortOrder: string;
};

const emptyActivityForm: ActivityFormState = {
  title: "",
  description: "",
  activityDate: "",
  generationId: "",
};

const emptyDetailForm: DetailImageFormState = {
  sortOrder: "0",
};

type ActivitiesAdminPageProps = {
  generationScoped?: boolean;
  generationSortOrder?: number | null;
};

export default function ActivitiesAdminPage({
  generationScoped = false,
  generationSortOrder = null,
}: ActivitiesAdminPageProps = {}) {
  const [items, setItems] = useState<ApiActivity[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createForm, setCreateForm] = useState<ActivityFormState>(emptyActivityForm);
  const [editForm, setEditForm] = useState<ActivityFormState>(emptyActivityForm);
  const [detailCreateForm, setDetailCreateForm] = useState<DetailImageFormState>(emptyDetailForm);
  const [detailEditForm, setDetailEditForm] = useState<DetailImageFormState>(emptyDetailForm);

  const createCoverUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityCover,
  });
  const editCoverUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityCover,
  });
  const detailCreateUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityDetail,
  });
  const detailEditUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityDetail,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "createActivity" | "deleteActivity" | "createDetailImage" | "deleteDetailImage" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<"activity" | "detail" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;
  const { queryState, setDrawerQuery, normalizeDrawerQuery } = useAdminDrawerQuerySync();

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedImage = useMemo(
    () => selected?.detailImages.find((image) => image.id === selectedImageId) ?? null,
    [selected, selectedImageId],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => b.activityDate - a.activityDate);
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    });
  }, [items, searchQuery]);

  const syncActivityEditForm = (item: ApiActivity | null) => {
    if (!item) {
      setEditForm(emptyActivityForm);
      editCoverUpload.reset(null);
      return;
    }

    setEditForm({
      title: item.title,
      description: item.description,
      activityDate: toDateInputValue(item.activityDate),
      generationId: item.generationId,
    });
    editCoverUpload.reset(item.coverImageUrl);
  };

  const syncDetailEditForm = (image: ApiActivityImage | null) => {
    if (!image) {
      setDetailEditForm(emptyDetailForm);
      detailEditUpload.reset(null);
      return;
    }

    setDetailEditForm({
      sortOrder: String(image.sortOrder),
    });
    detailEditUpload.reset(image.imageUrl);
  };

  const loadData = async (preferredSelectedId?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [activities, generationList] = await Promise.all([
        adminResourceApi.listActivities(),
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
      const visibleActivities =
        generationScoped && nextScopedGeneration
          ? activities.filter((activity) => activity.generationId === nextScopedGeneration.id)
          : generationScoped
            ? []
            : activities;

      setScopedGeneration(nextScopedGeneration);
      setItems(visibleActivities);
      setGenerations(visibleGenerations);

      setCreateForm((previous) => ({
        ...previous,
        generationId:
          previous.generationId ||
          nextScopedGeneration?.id ||
          visibleGenerations[0]?.id ||
          "",
      }));

      if (generationScoped && !nextScopedGeneration) {
        setSelectedId(null);
        setSelectedImageId(null);
        syncActivityEditForm(null);
        syncDetailEditForm(null);
        setErrorMessage("선택한 기수를 찾을 수 없습니다.");
        setPanelMode(null);
        return;
      }

      if (visibleActivities.length === 0) {
        setSelectedId(null);
        setSelectedImageId(null);
        syncActivityEditForm(null);
        syncDetailEditForm(null);
        if (panelMode === "edit") {
          setPanelMode(null);
        }
        return;
      }

      const fallbackId = visibleActivities[0]?.id ?? null;
      const nextSelectedId =
        preferredSelectedId ??
        (selectedId && visibleActivities.some((item) => item.id === selectedId)
          ? selectedId
          : null) ??
        fallbackId;

      setSelectedId(nextSelectedId);
      const selectedActivity =
        visibleActivities.find((item) => item.id === nextSelectedId) ?? null;
      syncActivityEditForm(selectedActivity);

      const nextImageId =
        selectedImageId &&
        selectedActivity?.detailImages.some((image) => image.id === selectedImageId)
          ? selectedImageId
          : selectedActivity?.detailImages[0]?.id ?? null;

      setSelectedImageId(nextImageId);
      syncDetailEditForm(
        nextImageId
          ? selectedActivity?.detailImages.find((image) => image.id === nextImageId) ?? null
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
  }, [generationScoped, generationSortOrder]);

  const handleSelectActivity = (item: ApiActivity) => {
    setSelectedId(item.id);
    syncActivityEditForm(item);
    const firstImage = item.detailImages[0] ?? null;
    setSelectedImageId(firstImage?.id ?? null);
    syncDetailEditForm(firstImage);
    detailCreateUpload.reset(null);
    setDetailCreateForm(emptyDetailForm);
    setPanelMode("edit");
    setDrawerQuery("edit", item.id);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSelectDetailImage = (image: ApiActivityImage) => {
    setSelectedImageId(image.id);
    syncDetailEditForm(image);
  };

  useEffect(() => {
    normalizeDrawerQuery();
  }, [normalizeDrawerQuery]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (queryState.panel === "create") {
      if (panelMode !== "create") {
        setCreateForm({
          ...emptyActivityForm,
          generationId: scopedGenerationId ?? generations[0]?.id ?? "",
        });
        createCoverUpload.reset(null);
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

      if (selectedId !== target.id || panelMode !== "edit") {
        handleSelectActivity(target);
      }
      return;
    }

    if (panelMode !== null) {
      setPanelMode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryState, isLoading, panelMode, items, selectedId, scopedGenerationId, generations]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createCoverUpload.isUploading || createCoverUpload.hasUploadError) {
      return;
    }
    if (!createCoverUpload.currentUrl) {
      setErrorMessage("대표 이미지 업로드를 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("createActivity");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await adminResourceApi.createActivity({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        activityDate: toTimestampMs(createForm.activityDate),
        coverImageUrl: createCoverUpload.currentUrl,
        generationId: scopedGenerationId ?? createForm.generationId,
      });

      setCreateForm({
        ...emptyActivityForm,
        generationId: scopedGenerationId ?? generations[0]?.id ?? "",
      });
      createCoverUpload.reset(null);
      setSuccessMessage("활동을 생성했습니다.");
      setPanelMode("edit");
      setDrawerQuery("edit", created.id);
      await loadData(created.id);
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
    if (editCoverUpload.isUploading || editCoverUpload.hasUploadError) {
      return;
    }
    if (!editCoverUpload.currentUrl) {
      setErrorMessage("대표 이미지 업로드를 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateActivity(selected.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        activityDate: toTimestampMs(editForm.activityDate),
        coverImageUrl: editCoverUpload.currentUrl,
        generationId: scopedGenerationId ?? editForm.generationId,
      });

      setSuccessMessage("활동을 수정했습니다.");
      await loadData(selected.id);
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
    setActiveSubmitAction("deleteActivity");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteActivity(selected.id);
      setSuccessMessage("활동을 삭제했습니다.");
      setDeleteTarget(null);
      setPanelMode(null);
      setDrawerQuery(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleCreateDetailImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }
    if (detailCreateUpload.isUploading || detailCreateUpload.hasUploadError) {
      return;
    }
    if (!detailCreateUpload.currentUrl) {
      setErrorMessage("세부 이미지 업로드를 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("createDetailImage");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.addActivityImage(selected.id, {
        imageUrl: detailCreateUpload.currentUrl,
        sortOrder: toPositiveInteger(detailCreateForm.sortOrder, "sortOrder"),
      });

      setDetailCreateForm(emptyDetailForm);
      detailCreateUpload.reset(null);
      setSuccessMessage("세부 이미지를 추가했습니다.");
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleUpdateDetailImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !selectedImage) {
      return;
    }
    if (detailEditUpload.isUploading || detailEditUpload.hasUploadError) {
      return;
    }
    if (!detailEditUpload.currentUrl) {
      setErrorMessage("세부 이미지 업로드를 완료해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.updateActivityImage(selected.id, selectedImage.id, {
        imageUrl: detailEditUpload.currentUrl,
        sortOrder: toPositiveInteger(detailEditForm.sortOrder, "sortOrder"),
      });

      setSuccessMessage("세부 이미지를 수정했습니다.");
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleDeleteDetailImage = async () => {
    if (!selected || !selectedImage) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("deleteDetailImage");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteActivityImage(selected.id, selectedImage.id);
      setSuccessMessage("세부 이미지를 삭제했습니다.");
      setDeleteTarget(null);
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const canSubmitCreateActivity =
    !isSubmitting &&
    !createCoverUpload.isUploading &&
    !createCoverUpload.hasUploadError &&
    Boolean(createCoverUpload.currentUrl);

  const canSubmitEditActivity =
    !isSubmitting &&
    !editCoverUpload.isUploading &&
    !editCoverUpload.hasUploadError &&
    Boolean(editCoverUpload.currentUrl);

  const canSubmitCreateDetail =
    !isSubmitting &&
    !detailCreateUpload.isUploading &&
    !detailCreateUpload.hasUploadError &&
    Boolean(detailCreateUpload.currentUrl);

  const canSubmitEditDetail =
    !isSubmitting &&
    !detailEditUpload.isUploading &&
    !detailEditUpload.hasUploadError &&
    Boolean(detailEditUpload.currentUrl);

  return (
    <div className="space-y-6" data-testid="activities-page">
      <AdminPageHeader
        title="활동 관리"
        description="활동 정보와 상세 이미지를 관리하는 화면입니다."
        guidance="목록에서 선택한 항목을 드로어에서 편집하거나 신규 버튼으로 빠르게 생성하세요."
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AdminActionButton
            onClick={() => {
              setCreateForm({
                ...emptyActivityForm,
                generationId: scopedGenerationId ?? generations[0]?.id ?? "",
              });
              createCoverUpload.reset(null);
              setPanelMode("create");
              setDrawerQuery("create");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            testId="activity-open-create"
          >
            + 신규 활동
          </AdminActionButton>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="activities-reload-button"
          >
            새로고침
          </button>
          {generationScoped ? (
            <p className="text-xs text-gray-500" data-testid="activities-scoped-generation">
              {scopedGeneration
                ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
                : "현재 기수를 확인하는 중..."}
            </p>
          ) : null}
        </div>
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        커버/세부 이미지는 파일 선택 즉시 업로드됩니다. 업로드가 끝나면 저장 버튼이 활성화됩니다.
      </AdminInfoBox>

      {errorMessage ? (
        <p
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="activities-error"
        >
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p
          className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700"
          data-testid="activities-success"
        >
          {successMessage}
        </p>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">활동 목록</h2>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="제목/설명 검색"
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="activity-search-input"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? "아직 등록된 활동이 없습니다."
              : "검색 조건에 맞는 활동이 없습니다."}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="activities-list">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-gray-200 p-3"
                data-testid={`activity-row-${item.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectActivity(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">소속 기수 ID: {item.generationId}</p>
                    <p className="text-xs text-gray-500">활동 날짜: {formatTimestamp(item.activityDate)}</p>
                    <p className="text-xs text-gray-500">세부 이미지 수: {item.detailImages.length}</p>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminDrawer
        open={panelMode !== null}
        title={panelMode === "create" ? "활동 생성" : "활동 수정"}
        description={
          panelMode === "create"
            ? "활동 기본 정보를 입력하고 생성하세요."
            : selected
              ? `"${selected.title}" 활동을 편집합니다.`
              : "수정할 활동을 선택해 주세요."
        }
        onClose={() => {
          if (!isSubmitting) {
            setPanelMode(null);
            setDrawerQuery(null);
          }
        }}
        testId="activity-drawer"
      >
        {panelMode === "create" ? (
          <form onSubmit={handleCreate} className="space-y-3" data-testid="activity-create-form">
            <label className="block text-sm">
              <span className="mb-1 block">활동 제목</span>
              <input
                type="text"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, title: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="activity-create-title"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">설명</span>
              <textarea
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, description: event.target.value }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={4}
                required
                data-testid="activity-create-description"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block">활동 날짜</span>
              <input
                type="date"
                value={createForm.activityDate}
                onChange={(event) =>
                  setCreateForm((previous) => ({
                    ...previous,
                    activityDate: event.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                data-testid="activity-create-date"
              />
            </label>

            {scopedGenerationId ? (
              <div
                className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                data-testid="activity-create-scoped-generation-field"
              >
                소속 기수는 현재 선택한 기수로 고정됩니다.
              </div>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block">소속 기수</span>
                <select
                  value={createForm.generationId}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      generationId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-create-generation-id"
                >
                  <option value="" disabled>
                    기수를 선택해 주세요.
                  </option>
                  {generations.map((generation) => (
                    <option key={generation.id} value={generation.id}>
                      {generation.name} ({generation.sortOrder})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <ImageInput
              label="대표 이미지"
              file={createCoverUpload.file}
              onFileChange={createCoverUpload.selectFile}
              currentUrl={createCoverUpload.currentUrl}
              status={createCoverUpload.status}
              errorMessage={createCoverUpload.errorMessage}
              onRetry={createCoverUpload.retry}
              uploadProgress={createCoverUpload.progress}
              isUploading={createCoverUpload.isUploading}
              testIdPrefix="activity-create-cover"
              disabled={isSubmitting}
            />

            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "createActivity"}
              disabled={!canSubmitCreateActivity}
              loadingText="활동 생성 중..."
              className="mt-2"
              testId="activity-create-submit"
            >
              활동 생성
            </AdminActionButton>
          </form>
        ) : selected ? (
          <div className="space-y-5">
            <form onSubmit={handleUpdate} className="space-y-3" data-testid="activity-edit-form">
              <label className="block text-sm">
                <span className="mb-1 block">활동 제목</span>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, title: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-edit-title"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">설명</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={4}
                  required
                  data-testid="activity-edit-description"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">활동 날짜</span>
                <input
                  type="date"
                  value={editForm.activityDate}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      activityDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-edit-date"
                />
              </label>

              {scopedGenerationId ? (
                <div
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  data-testid="activity-edit-scoped-generation-field"
                >
                  소속 기수는 현재 선택한 기수로 고정됩니다.
                </div>
              ) : (
                <label className="block text-sm">
                  <span className="mb-1 block">소속 기수</span>
                  <select
                    value={editForm.generationId}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        generationId: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                    data-testid="activity-edit-generation-id"
                  >
                    <option value="" disabled>
                      기수를 선택해 주세요.
                    </option>
                    {generations.map((generation) => (
                      <option key={generation.id} value={generation.id}>
                        {generation.name} ({generation.sortOrder})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <ImageInput
                label="대표 이미지"
                file={editCoverUpload.file}
                onFileChange={editCoverUpload.selectFile}
                currentUrl={editCoverUpload.currentUrl}
                status={editCoverUpload.status}
                errorMessage={editCoverUpload.errorMessage}
                onRetry={editCoverUpload.retry}
                uploadProgress={editCoverUpload.progress}
                isUploading={editCoverUpload.isUploading}
                testIdPrefix="activity-edit-cover"
                disabled={isSubmitting}
              />

              <div className="mt-2 flex gap-2">
                <AdminActionButton
                  type="submit"
                  disabled={!canSubmitEditActivity}
                  testId="activity-edit-submit"
                >
                  수정 저장
                </AdminActionButton>
                <AdminActionButton
                  variant="danger"
                  onClick={() => {
                    if (!isSubmitting) {
                      setDeleteTarget("activity");
                    }
                  }}
                  loading={activeSubmitAction === "deleteActivity"}
                  disabled={isSubmitting && activeSubmitAction !== "deleteActivity"}
                  loadingText="활동 삭제 중..."
                  testId="activity-delete-button"
                >
                  활동 삭제
                </AdminActionButton>
              </div>
            </form>

            <form
              onSubmit={handleCreateDetailImage}
              className="space-y-3 rounded-lg border border-gray-200 p-3"
              data-testid="activity-detail-create-form"
            >
              <h3 className="text-sm font-semibold">세부 이미지 추가</h3>
              <p className="text-xs text-gray-500">선택된 활동: {selected.title}</p>

              <ImageInput
                label="세부 이미지"
                file={detailCreateUpload.file}
                onFileChange={detailCreateUpload.selectFile}
                currentUrl={detailCreateUpload.currentUrl}
                status={detailCreateUpload.status}
                errorMessage={detailCreateUpload.errorMessage}
                onRetry={detailCreateUpload.retry}
                uploadProgress={detailCreateUpload.progress}
                isUploading={detailCreateUpload.isUploading}
                testIdPrefix="activity-detail-create-image"
                disabled={isSubmitting}
              />

              <label className="block text-sm">
                <span className="mb-1 block">정렬 순서</span>
                <input
                  type="number"
                  min={0}
                  value={detailCreateForm.sortOrder}
                  onChange={(event) =>
                    setDetailCreateForm((previous) => ({
                      ...previous,
                      sortOrder: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-detail-create-sort-order"
                />
              </label>

              <AdminActionButton
                type="submit"
                loading={activeSubmitAction === "createDetailImage"}
                disabled={!canSubmitCreateDetail}
                loadingText="이미지 추가 중..."
                testId="activity-detail-create-submit"
              >
                세부 이미지 추가
              </AdminActionButton>
            </form>

            <article
              className="rounded-lg border border-gray-200 p-3"
              data-testid="activity-detail-edit-card"
            >
              <h3 className="mb-2 text-sm font-semibold">세부 이미지 수정/삭제</h3>
              {selected.detailImages.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 세부 이미지가 없습니다.</p>
              ) : (
                <ul className="mb-3 space-y-2" data-testid="activity-detail-list">
                  {selected.detailImages.map((image) => (
                    <li
                      key={image.id}
                      className="rounded-md border border-gray-200 p-2"
                      data-testid={`activity-detail-row-${image.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectDetailImage(image)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-sm font-medium">정렬 순서: {image.sortOrder}</p>
                          <p className="truncate text-xs text-gray-500">{image.imageUrl}</p>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleUpdateDetailImage} className="space-y-3" data-testid="activity-detail-edit-form">
                {selectedImage ? (
                  <>
                    <ImageInput
                      label="세부 이미지"
                      file={detailEditUpload.file}
                      onFileChange={detailEditUpload.selectFile}
                      currentUrl={detailEditUpload.currentUrl}
                      status={detailEditUpload.status}
                      errorMessage={detailEditUpload.errorMessage}
                      onRetry={detailEditUpload.retry}
                      uploadProgress={detailEditUpload.progress}
                      isUploading={detailEditUpload.isUploading}
                      testIdPrefix="activity-detail-edit-image"
                      disabled={isSubmitting}
                    />

                    <label className="block text-sm">
                      <span className="mb-1 block">정렬 순서</span>
                      <input
                        type="number"
                        min={0}
                        value={detailEditForm.sortOrder}
                        onChange={(event) =>
                          setDetailEditForm((previous) => ({
                            ...previous,
                            sortOrder: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="activity-detail-edit-sort-order"
                      />
                    </label>

                    <div className="flex gap-2">
                      <AdminActionButton
                        type="submit"
                        disabled={!canSubmitEditDetail}
                        testId="activity-detail-edit-submit"
                      >
                        수정 저장
                      </AdminActionButton>
                      <AdminActionButton
                        variant="danger"
                        onClick={() => {
                          if (!isSubmitting) {
                            setDeleteTarget("detail");
                          }
                        }}
                        loading={activeSubmitAction === "deleteDetailImage"}
                        disabled={
                          isSubmitting && activeSubmitAction !== "deleteDetailImage"
                        }
                        loadingText="이미지 삭제 중..."
                        testId="activity-detail-delete-button"
                      >
                        이미지 삭제
                      </AdminActionButton>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">수정할 세부 이미지를 선택해 주세요.</p>
                )}
              </form>
            </article>
          </div>
        ) : (
          <p className="text-sm text-gray-500">수정할 활동을 선택해 주세요.</p>
        )}
      </AdminDrawer>

      <AdminConfirmModal
        open={deleteTarget !== null}
        title={deleteTarget === "detail" ? "세부 이미지를 삭제할까요?" : "활동을 삭제할까요?"}
        description={
          deleteTarget === "detail"
            ? selectedImage
              ? `"${selected?.title ?? "선택한 활동"}"의 세부 이미지가 삭제됩니다.`
              : "선택한 세부 이미지를 삭제합니다."
            : selected
              ? `"${selected.title}" 활동과 연결된 세부 이미지가 모두 삭제됩니다.`
              : "선택한 활동을 삭제합니다."
        }
        confirmText="삭제하기"
        confirmLoadingText="삭제 중..."
        isLoading={
          activeSubmitAction === "deleteActivity" ||
          activeSubmitAction === "deleteDetailImage"
        }
        onConfirm={() => {
          if (deleteTarget === "detail") {
            void handleDeleteDetailImage();
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
