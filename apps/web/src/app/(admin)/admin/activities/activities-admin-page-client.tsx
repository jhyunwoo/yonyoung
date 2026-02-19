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
import BatchImageDropzone from "../components/batch-image-dropzone";
import AdminConfirmModal from "../components/admin-confirm-modal";
import AdminDrawer from "../components/admin-drawer";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import ImageInput from "../components/image-input";
import { useAdminDrawerQuerySync } from "../components/use-admin-drawer-query-sync";
import { useBatchImageUpload } from "../components/use-batch-image-upload";
import { useImmediateImageUpload } from "../components/use-immediate-image-upload";

type ActivityFormState = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  generationId: string;
};

const emptyActivityForm: ActivityFormState = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  generationId: "",
};

type DetailImageDraft = {
  sortOrder: string;
  imageUrl: string;
};

type ActivitiesAdminPageProps = {
  generationScoped?: boolean;
  generationSortOrder?: number | null;
  initialData?: {
    activities: ApiActivity[];
    generations: ApiGeneration[];
  };
};

type ResolvedActivitiesData = {
  scopedGeneration: ApiGeneration | null;
  visibleGenerations: ApiGeneration[];
  visibleActivities: ApiActivity[];
};

const resolveActivitiesData = (
  activities: ApiActivity[],
  generationList: ApiGeneration[],
  generationScoped: boolean,
  generationSortOrder: number | null,
): ResolvedActivitiesData => {
  const scopedGeneration = generationScoped
    ? generationList.find((generation) => generation.sortOrder === generationSortOrder) ?? null
    : null;

  const visibleGenerations = generationScoped
    ? scopedGeneration
      ? [scopedGeneration]
      : []
    : generationList;

  const visibleActivities =
    generationScoped && scopedGeneration
      ? activities.filter((activity) => activity.generationId === scopedGeneration.id)
      : generationScoped
        ? []
        : activities;

  return {
    scopedGeneration,
    visibleGenerations,
    visibleActivities,
  };
};

export default function ActivitiesAdminPage({
  generationScoped = false,
  generationSortOrder = null,
  initialData,
}: ActivitiesAdminPageProps = {}) {
  const initialResolvedData = initialData
    ? resolveActivitiesData(
        initialData.activities,
        initialData.generations,
        generationScoped,
        generationSortOrder,
      )
    : null;

  const [items, setItems] = useState<ApiActivity[]>(
    initialResolvedData?.visibleActivities ?? [],
  );
  const [generations, setGenerations] = useState<ApiGeneration[]>(
    initialResolvedData?.visibleGenerations ?? [],
  );
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(
    initialResolvedData?.scopedGeneration ?? null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createForm, setCreateForm] = useState<ActivityFormState>(emptyActivityForm);
  const [editForm, setEditForm] = useState<ActivityFormState>(emptyActivityForm);
  const [detailDrafts, setDetailDrafts] = useState<Record<string, DetailImageDraft>>({});
  const [detailUploadTargetImageId, setDetailUploadTargetImageId] = useState<string | null>(
    null,
  );
  const [createQueuedDragId, setCreateQueuedDragId] = useState<string | null>(null);
  const [editQueuedDragId, setEditQueuedDragId] = useState<string | null>(null);
  const [detailImageDragId, setDetailImageDragId] = useState<string | null>(null);

  const createCoverUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityCover,
  });
  const editCoverUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityCover,
  });
  const createDetailBatchUpload = useBatchImageUpload(PRESIGN_PATHS.activityDetail);
  const detailBatchUpload = useBatchImageUpload(PRESIGN_PATHS.activityDetail);
  const detailEditUpload = useImmediateImageUpload({
    presignPath: PRESIGN_PATHS.activityDetail,
  });

  const [isLoading, setIsLoading] = useState(() => !initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    | "createActivity"
    | "deleteActivity"
    | "createDetailImages"
    | "saveDetailImages"
    | "deleteDetailImage"
    | null
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
  const selectedImageDraft = useMemo(() => {
    if (!selectedImage) {
      return null;
    }
    return detailDrafts[selectedImage.id] ?? null;
  }, [detailDrafts, selectedImage]);

  const sortedSelectedDetailImages = useMemo(() => {
    if (!selected) {
      return [];
    }

    return [...selected.detailImages].sort((a, b) => {
      const aRaw = detailDrafts[a.id]?.sortOrder ?? String(a.sortOrder);
      const bRaw = detailDrafts[b.id]?.sortOrder ?? String(b.sortOrder);
      const aSortOrder = Number.parseInt(aRaw, 10);
      const bSortOrder = Number.parseInt(bRaw, 10);
      const resolvedA = Number.isFinite(aSortOrder) ? aSortOrder : a.sortOrder;
      const resolvedB = Number.isFinite(bSortOrder) ? bSortOrder : b.sortOrder;
      return resolvedA - resolvedB;
    });
  }, [detailDrafts, selected]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...items].sort((a, b) => b.startDate - a.startDate);
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
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
      generationId: item.generationId,
    });
    editCoverUpload.reset(item.coverImageUrl);
  };

  const syncDetailDrafts = (images: ApiActivityImage[]) => {
    const nextDrafts: Record<string, DetailImageDraft> = {};
    for (const image of images) {
      nextDrafts[image.id] = {
        sortOrder: String(image.sortOrder),
        imageUrl: image.imageUrl,
      };
    }
    setDetailDrafts(nextDrafts);
  };

  const applyLoadedData = (
    activities: ApiActivity[],
    generationList: ApiGeneration[],
    preferredSelectedId?: string | null,
  ) => {
    const { scopedGeneration, visibleGenerations, visibleActivities } = resolveActivitiesData(
      activities,
      generationList,
      generationScoped,
      generationSortOrder,
    );

    setScopedGeneration(scopedGeneration);
    setItems(visibleActivities);
    setGenerations(visibleGenerations);

    setCreateForm((previous) => ({
      ...previous,
      generationId:
        previous.generationId || scopedGeneration?.id || visibleGenerations[0]?.id || "",
    }));

    if (generationScoped && !scopedGeneration) {
      setSelectedId(null);
      setSelectedImageId(null);
      syncActivityEditForm(null);
      setDetailDrafts({});
      detailEditUpload.reset(null);
      detailBatchUpload.clear();
      setErrorMessage("선택한 기수를 찾을 수 없습니다.");
      setPanelMode(null);
      return;
    }

    if (visibleActivities.length === 0) {
      setSelectedId(null);
      setSelectedImageId(null);
      syncActivityEditForm(null);
      setDetailDrafts({});
      detailEditUpload.reset(null);
      detailBatchUpload.clear();
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
    syncDetailDrafts(selectedActivity?.detailImages ?? []);
    detailEditUpload.reset(
      nextImageId
        ? selectedActivity?.detailImages.find((image) => image.id === nextImageId)?.imageUrl ?? null
        : null,
    );
    detailBatchUpload.clear();
  };

  const loadData = async (preferredSelectedId?: string | null) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [activities, generationList] = await Promise.all([
        adminResourceApi.listActivities(),
        adminResourceApi.listGenerations(),
      ]);
      applyLoadedData(activities, generationList, preferredSelectedId);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      applyLoadedData(initialData.activities, initialData.generations);
      setIsLoading(false);
      return;
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationScoped, generationSortOrder, initialData]);

  const handleSelectActivity = (item: ApiActivity) => {
    setSelectedId(item.id);
    syncActivityEditForm(item);
    const firstImage = item.detailImages[0] ?? null;
    setSelectedImageId(firstImage?.id ?? null);
    syncDetailDrafts(item.detailImages);
    detailEditUpload.reset(firstImage?.imageUrl ?? null);
    detailBatchUpload.clear();
    setDetailUploadTargetImageId(null);
    setPanelMode("edit");
    setDrawerQuery("edit", item.id);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSelectDetailImage = (image: ApiActivityImage) => {
    setSelectedImageId(image.id);
    const draftImageUrl = detailDrafts[image.id]?.imageUrl ?? image.imageUrl;
    detailEditUpload.reset(draftImageUrl);
    setDetailUploadTargetImageId(null);
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
        createDetailBatchUpload.clear();
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
    if (createDetailBatchUpload.hasUploading) {
      setErrorMessage("세부 이미지 업로드가 완료될 때까지 기다려 주세요.");
      return;
    }
    if (createDetailBatchUpload.hasError) {
      setErrorMessage("업로드 실패한 세부 이미지를 제거하거나 재시도해 주세요.");
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
        startDate: toTimestampMs(createForm.startDate),
        endDate: toTimestampMs(createForm.endDate),
        coverImageUrl: createCoverUpload.currentUrl,
        generationId: scopedGenerationId ?? createForm.generationId,
      });

      if (createDetailBatchUpload.uploadedItems.length > 0) {
        await adminResourceApi.addActivityImages(
          created.id,
          createDetailBatchUpload.uploadedItems.map((item) => ({
            imageUrl: item.imageUrl,
            sortOrder: item.sortOrder,
          })),
        );
      }

      setCreateForm({
        ...emptyActivityForm,
        generationId: scopedGenerationId ?? generations[0]?.id ?? "",
      });
      createCoverUpload.reset(null);
      createDetailBatchUpload.clear();
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
        startDate: toTimestampMs(editForm.startDate),
        endDate: toTimestampMs(editForm.endDate),
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

  const queueCreateDetailFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    const nextSortOrder =
      createDetailBatchUpload.items.reduce(
        (max, item) => Math.max(max, item.sortOrder),
        -1,
      ) + 1;
    createDetailBatchUpload.addFiles(files, nextSortOrder);
  };

  const queueEditDetailFiles = (files: File[]) => {
    if (!selected) {
      return;
    }
    if (files.length === 0) {
      return;
    }
    const existingMaxSortOrder = selected.detailImages.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1,
    );
    const queuedMaxSortOrder = detailBatchUpload.items.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1,
    );
    const nextSortOrder = Math.max(existingMaxSortOrder, queuedMaxSortOrder) + 1;
    detailBatchUpload.addFiles(files, nextSortOrder);
  };

  const handleCreateDetailImages = async () => {
    if (!selected) {
      return;
    }
    if (detailBatchUpload.items.length === 0) {
      setErrorMessage("추가할 세부 이미지를 선택해 주세요.");
      return;
    }
    if (detailBatchUpload.hasUploading) {
      setErrorMessage("세부 이미지 업로드가 완료될 때까지 기다려 주세요.");
      return;
    }
    if (detailBatchUpload.hasError) {
      setErrorMessage("업로드 실패한 세부 이미지를 제거하거나 재시도해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("createDetailImages");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.addActivityImages(
        selected.id,
        detailBatchUpload.uploadedItems.map((item) => ({
          imageUrl: item.imageUrl,
          sortOrder: item.sortOrder,
        })),
      );
      detailBatchUpload.clear();
      setSuccessMessage("세부 이미지를 추가했습니다.");
      await loadData(selected.id);
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const handleDetailSortOrderChange = (imageId: string, nextValue: string) => {
    setDetailDrafts((previous) => ({
      ...previous,
      [imageId]: {
        sortOrder: nextValue,
        imageUrl: previous[imageId]?.imageUrl ?? "",
      },
    }));
  };

  const handleReorderDetailImages = (draggedImageId: string, targetImageId: string) => {
    if (!selected || draggedImageId === targetImageId) {
      return;
    }

    const orderedIds = sortedSelectedDetailImages.map((image) => image.id);
    const sourceIndex = orderedIds.indexOf(draggedImageId);
    const targetIndex = orderedIds.indexOf(targetImageId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextOrderedIds = [...orderedIds];
    const [draggedId] = nextOrderedIds.splice(sourceIndex, 1);
    if (!draggedId) {
      return;
    }
    nextOrderedIds.splice(targetIndex, 0, draggedId);

    setDetailDrafts((previous) => {
      const nextDrafts = { ...previous };
      for (const [index, imageId] of nextOrderedIds.entries()) {
        const baseImage =
          selected.detailImages.find((detailImage) => detailImage.id === imageId) ?? null;
        nextDrafts[imageId] = {
          sortOrder: String(index),
          imageUrl: previous[imageId]?.imageUrl ?? baseImage?.imageUrl ?? "",
        };
      }
      return nextDrafts;
    });
  };

  const handleDetailImageFileChange = (file: File | null) => {
    if (!selectedImage || !file) {
      return;
    }
    setDetailUploadTargetImageId(selectedImage.id);
    detailEditUpload.selectFile(file);
  };

  useEffect(() => {
    if (
      detailEditUpload.status !== "uploaded" ||
      !detailUploadTargetImageId ||
      !detailEditUpload.currentUrl
    ) {
      return;
    }

    setDetailDrafts((previous) => ({
      ...previous,
      [detailUploadTargetImageId]: {
        sortOrder: previous[detailUploadTargetImageId]?.sortOrder ?? "0",
        imageUrl: detailEditUpload.currentUrl,
      },
    }));
  }, [
    detailEditUpload.currentUrl,
    detailEditUpload.status,
    detailUploadTargetImageId,
  ]);

  const handleSaveDetailImages = async () => {
    if (!selected) {
      return;
    }
    if (detailEditUpload.isUploading || detailEditUpload.hasUploadError) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("saveDetailImages");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const changedImages = selected.detailImages.flatMap((image) => {
        const draft = detailDrafts[image.id];
        if (!draft) {
          return [];
        }
        const nextSortOrder = toPositiveInteger(draft.sortOrder, "sortOrder");
        if (draft.imageUrl === image.imageUrl && nextSortOrder === image.sortOrder) {
          return [];
        }
        return [
          {
            imageId: image.id,
            imageUrl: draft.imageUrl,
            sortOrder: nextSortOrder,
          },
        ];
      });

      if (changedImages.length === 0) {
        setSuccessMessage("변경된 세부 이미지가 없습니다.");
        return;
      }

      await adminResourceApi.updateActivityImages(selected.id, changedImages);
      setSuccessMessage("세부 이미지 변경사항을 저장했습니다.");
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
    !createDetailBatchUpload.hasUploading &&
    !createDetailBatchUpload.hasError &&
    Boolean(createCoverUpload.currentUrl);

  const canSubmitEditActivity =
    !isSubmitting &&
    !editCoverUpload.isUploading &&
    !editCoverUpload.hasUploadError &&
    Boolean(editCoverUpload.currentUrl);

  const canSaveDetailImages =
    !isSubmitting &&
    !detailEditUpload.isUploading &&
    !detailEditUpload.hasUploadError;

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
              createDetailBatchUpload.clear();
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
        커버/세부 이미지는 파일 선택 즉시 업로드됩니다. 세부 이미지는 여러 장을 드래그 앤 드롭으로 추가하고, 업로드 후 목록에서 드래그해 순서를 변경할 수 있습니다.
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
                    <p className="text-xs text-gray-500">
                      활동 기간: {formatTimestamp(item.startDate)} ~ {formatTimestamp(item.endDate)}
                    </p>
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block">활동 시작일</span>
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      startDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-create-start-date"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block">활동 종료일</span>
                <input
                  type="date"
                  value={createForm.endDate}
                  onChange={(event) =>
                    setCreateForm((previous) => ({
                      ...previous,
                      endDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-create-end-date"
                />
              </label>
            </div>

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
              previewAspectRatio="4/3"
              testIdPrefix="activity-create-cover"
              disabled={isSubmitting}
            />

            <section
              className="space-y-3 rounded-lg border border-gray-200 p-3"
              data-testid="activity-create-detail-batch"
            >
              <div>
                <h3 className="text-sm font-semibold">세부 이미지(선택)</h3>
                <p className="text-xs text-gray-500">
                  여러 장을 한 번에 업로드한 뒤 활동 생성과 함께 저장됩니다.
                </p>
              </div>
              <BatchImageDropzone
                title="세부 이미지 추가"
                description="이미지를 끌어다 놓거나 클릭해 여러 장을 한 번에 업로드하세요."
                testId="activity-create-detail-files"
                disabled={isSubmitting}
                onFilesSelected={queueCreateDetailFiles}
              />
              {createDetailBatchUpload.items.length > 0 ? (
                <ul className="space-y-2">
                  {createDetailBatchUpload.items.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-md border border-gray-200 p-2 ${
                        createQueuedDragId === item.id ? "opacity-60" : ""
                      }`}
                      data-testid={`activity-create-detail-upload-${item.id}`}
                      draggable
                      onDragStart={() => setCreateQueuedDragId(item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!createQueuedDragId || createQueuedDragId === item.id) {
                          return;
                        }
                        createDetailBatchUpload.moveItem(createQueuedDragId, item.id);
                        setCreateQueuedDragId(null);
                      }}
                      onDragEnd={() => setCreateQueuedDragId(null)}
                    >
                      <p className="truncate text-xs text-gray-600">{item.fileName}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          정렬 순서
                          <input
                            type="number"
                            min={0}
                            value={item.sortOrder}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              if (!Number.isInteger(nextValue) || nextValue < 0) {
                                return;
                              }
                              createDetailBatchUpload.setSortOrder(item.id, nextValue);
                            }}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <p className="text-xs text-gray-500">
                          {item.status === "uploading"
                            ? `업로드 중... ${item.progress}%`
                            : item.status === "uploaded"
                              ? "업로드 완료"
                              : item.errorMessage ?? "업로드 실패"}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {item.status === "failed" ? (
                          <button
                            type="button"
                            onClick={() => createDetailBatchUpload.retryItem(item.id)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                          >
                            재시도
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => createDetailBatchUpload.removeItem(item.id)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        >
                          제거
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

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

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block">활동 시작일</span>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        startDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                    data-testid="activity-edit-start-date"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block">활동 종료일</span>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(event) =>
                      setEditForm((previous) => ({
                        ...previous,
                        endDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                    data-testid="activity-edit-end-date"
                  />
                </label>
              </div>

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
                previewAspectRatio="4/3"
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

            <section
              className="space-y-3 rounded-lg border border-gray-200 p-3"
              data-testid="activity-detail-create-form"
            >
              <h3 className="text-sm font-semibold">세부 이미지 일괄 추가</h3>
              <p className="text-xs text-gray-500">선택된 활동: {selected.title}</p>

              <BatchImageDropzone
                title="세부 이미지 추가"
                description="이미지를 끌어다 놓거나 클릭해 업로드할 수 있습니다."
                testId="activity-detail-create-files"
                disabled={isSubmitting}
                onFilesSelected={queueEditDetailFiles}
              />

              {detailBatchUpload.items.length > 0 ? (
                <ul className="space-y-2">
                  {detailBatchUpload.items.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-md border border-gray-200 p-2 ${
                        editQueuedDragId === item.id ? "opacity-60" : ""
                      }`}
                      draggable
                      onDragStart={() => setEditQueuedDragId(item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!editQueuedDragId || editQueuedDragId === item.id) {
                          return;
                        }
                        detailBatchUpload.moveItem(editQueuedDragId, item.id);
                        setEditQueuedDragId(null);
                      }}
                      onDragEnd={() => setEditQueuedDragId(null)}
                    >
                      <p className="truncate text-xs text-gray-600">{item.fileName}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          정렬 순서
                          <input
                            type="number"
                            min={0}
                            value={item.sortOrder}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              if (!Number.isInteger(nextValue) || nextValue < 0) {
                                return;
                              }
                              detailBatchUpload.setSortOrder(item.id, nextValue);
                            }}
                            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                          />
                        </label>
                        <p className="text-xs text-gray-500">
                          {item.status === "uploading"
                            ? `업로드 중... ${item.progress}%`
                            : item.status === "uploaded"
                              ? "업로드 완료"
                              : item.errorMessage ?? "업로드 실패"}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {item.status === "failed" ? (
                          <button
                            type="button"
                            onClick={() => detailBatchUpload.retryItem(item.id)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                          >
                            재시도
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => detailBatchUpload.removeItem(item.id)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                        >
                          제거
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <AdminActionButton
                onClick={() => void handleCreateDetailImages()}
                loading={activeSubmitAction === "createDetailImages"}
                disabled={
                  isSubmitting ||
                  detailBatchUpload.items.length === 0 ||
                  detailBatchUpload.hasUploading ||
                  detailBatchUpload.hasError
                }
                loadingText="이미지 추가 중..."
                testId="activity-detail-create-submit"
              >
                세부 이미지 일괄 추가
              </AdminActionButton>
            </section>

            <article
              className="rounded-lg border border-gray-200 p-3"
              data-testid="activity-detail-edit-card"
            >
              <h3 className="mb-2 text-sm font-semibold">세부 이미지 수정/삭제</h3>
              {selected.detailImages.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 세부 이미지가 없습니다.</p>
              ) : (
                <ul className="mb-3 space-y-2" data-testid="activity-detail-list">
                  {sortedSelectedDetailImages.map((image) => (
                    <li
                      key={image.id}
                      className={`rounded-md border border-gray-200 p-2 ${
                        detailImageDragId === image.id ? "opacity-60" : ""
                      }`}
                      data-testid={`activity-detail-row-${image.id}`}
                      draggable
                      onDragStart={() => setDetailImageDragId(image.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!detailImageDragId || detailImageDragId === image.id) {
                          return;
                        }
                        handleReorderDetailImages(detailImageDragId, image.id);
                        setDetailImageDragId(null);
                      }}
                      onDragEnd={() => setDetailImageDragId(null)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectDetailImage(image)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-sm font-medium">
                            정렬 순서: {detailDrafts[image.id]?.sortOrder ?? image.sortOrder}
                          </p>
                          <p className="truncate text-xs text-gray-500">{image.imageUrl}</p>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-3" data-testid="activity-detail-edit-form">
                {selectedImage ? (
                  <>
                    <ImageInput
                      label="세부 이미지"
                      file={detailEditUpload.file}
                      onFileChange={handleDetailImageFileChange}
                      currentUrl={selectedImageDraft?.imageUrl ?? selectedImage.imageUrl}
                      status={detailEditUpload.status}
                      errorMessage={detailEditUpload.errorMessage}
                      onRetry={detailEditUpload.retry}
                      uploadProgress={detailEditUpload.progress}
                      isUploading={detailEditUpload.isUploading}
                      previewAspectRatio="4/3"
                      testIdPrefix="activity-detail-edit-image"
                      disabled={isSubmitting}
                    />

                    <label className="block text-sm">
                      <span className="mb-1 block">정렬 순서</span>
                      <input
                        type="number"
                        min={0}
                        value={selectedImageDraft?.sortOrder ?? ""}
                        onChange={(event) =>
                          handleDetailSortOrderChange(selectedImage.id, event.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="activity-detail-edit-sort-order"
                      />
                    </label>

                    <div className="flex gap-2">
                      <AdminActionButton
                        onClick={() => void handleSaveDetailImages()}
                        loading={activeSubmitAction === "saveDetailImages"}
                        disabled={!canSaveDetailImages}
                        loadingText="저장 중..."
                        testId="activity-detail-save-all"
                      >
                        모두 저장
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
              </div>
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
