"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { type AdminEntityRouteMode, buildAdminEntityRoute } from "../components/admin-entity-route";
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import DragReorderBadge from "../components/drag-reorder-badge";
import ImageInput from "../components/image-input";
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
  basePath?: string;
  generationScoped?: boolean;
  generationSortOrder?: number | null;
  routeId?: string | null;
  routeMode?: AdminEntityRouteMode;
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
  basePath = "/admin/activities",
  generationScoped = false,
  generationSortOrder = null,
  routeId = null,
  routeMode = "list",
  initialData,
}: ActivitiesAdminPageProps = {}) {
  const router = useRouter();
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
  const isDetailRoute = routeMode === "detail";

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedImage = useMemo(
    () => selected?.detailImages.find((image) => image.id === selectedImageId) ?? null,
    [selected, selectedImageId],
  );
  const generationLabelById = useMemo(
    () =>
      new Map(
        generations.map((generation) => [
          generation.id,
          `${generation.sortOrder}기 (${generation.name})`,
        ]),
      ),
    [generations],
  );

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

  const handleSelectActivity = (item: ApiActivity, navigate = true) => {
    setSelectedId(item.id);
    syncActivityEditForm(item);
    const firstImage = item.detailImages[0] ?? null;
    setSelectedImageId(firstImage?.id ?? null);
    syncDetailDrafts(item.detailImages);
    detailBatchUpload.clear();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (navigate) {
      router.push(buildAdminEntityRoute(basePath, "detail", item.id), { scroll: false });
    }
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (routeMode === "create") {
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

    if (routeMode === "detail" || routeMode === "edit") {
      const target = items.find((item) => item.id === routeId) ?? null;
      if (!target) {
        router.replace(buildAdminEntityRoute(basePath, "list"), { scroll: false });
        return;
      }

      if (selectedId !== target.id) {
        handleSelectActivity(target, false);
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
    scopedGenerationId,
    generations,
    router,
    basePath,
  ]);

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
    setActiveSubmitAction("deleteActivity");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteActivity(selected.id);
      setSuccessMessage("활동을 삭제했습니다.");
      setDeleteTarget(null);
      setPanelMode(null);
      await loadData();
      router.replace(buildAdminEntityRoute(basePath, "list"), { scroll: false });
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

  const handleSaveDetailImages = async () => {
    if (!selected) {
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

  const canSaveDetailImages = !isSubmitting;

  return (
    <div className="space-y-6" data-testid="activities-page">
      <AdminPageHeader
        title="활동 관리"
        description="활동 정보와 상세 이미지를 관리하는 화면입니다."
        guidance="목록에서 활동을 선택해 상세 페이지로 이동하고, 상세 페이지에서 수정 페이지로 이동해 편집하세요."
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
              router.push(buildAdminEntityRoute(basePath, "create"), { scroll: false });
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
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="activities-list">
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
                    <p className="text-xs text-gray-500">
                      소속 기수: {generationLabelById.get(item.generationId) ?? "미확인 기수"}
                    </p>
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
            router.push(buildAdminEntityRoute(basePath, "list"), { scroll: false });
          }
        }}
        testId="activity-drawer"
        variant="page"
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
                <p className="mt-1 text-xs text-gray-500">
                  카드의 드래그 핸들을 마우스로 잡아 순서를 조정할 수 있습니다.
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
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {createDetailBatchUpload.items.map((item) => (
                    <li
                      key={item.id}
                      className={`relative aspect-[4/3] cursor-grab overflow-hidden rounded-md border border-gray-200 bg-gray-50 transition-shadow hover:shadow-sm active:cursor-grabbing ${
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
                      <DragReorderBadge compact className="absolute left-2 top-2 z-10" />
                      {item.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => createDetailBatchUpload.retryItem(item.id)}
                          className="absolute top-2 right-14 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-700 hover:bg-white"
                        >
                          재시도
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => createDetailBatchUpload.removeItem(item.id)}
                        className="absolute top-2 right-2 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-red-700 hover:bg-white"
                      >
                        삭제
                      </button>
                      <span className="absolute left-2 bottom-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                        정렬 {item.sortOrder}
                      </span>
                      <span className="absolute right-2 bottom-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                        {item.status === "pending"
                          ? "준비"
                          : item.status === "uploading"
                            ? item.progress > 0
                              ? `${item.progress}%`
                              : "업로드"
                            : item.status === "uploaded"
                              ? "완료"
                              : "실패"}
                      </span>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={`${item.fileName} 미리보기`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          업로드 중
                        </div>
                      )}
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
        ) : selected && isDetailRoute ? (
          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-base font-semibold text-gray-900">{selected.title}</p>
              <p className="mt-1 text-sm text-gray-600">{selected.description}</p>
              <p className="mt-2 text-sm text-gray-600">
                소속 기수: {generationLabelById.get(selected.generationId) ?? "미확인 기수"}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                활동 기간: {formatTimestamp(selected.startDate)} ~ {formatTimestamp(selected.endDate)}
              </p>
              <p className="mt-1 text-sm text-gray-600">세부 이미지 수: {selected.detailImages.length}</p>
            </section>

            {sortedSelectedDetailImages.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {sortedSelectedDetailImages.map((image) => (
                  <li key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                    <span className="absolute left-2 bottom-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                      정렬 {detailDrafts[image.id]?.sortOrder ?? image.sortOrder}
                    </span>
                    <Image
                      src={detailDrafts[image.id]?.imageUrl ?? image.imageUrl}
                      alt={`${selected.title} 세부 이미지`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <AdminActionButton
                onClick={() =>
                  router.push(buildAdminEntityRoute(basePath, "edit", selected.id), {
                    scroll: false,
                  })
                }
                testId="activity-open-edit"
              >
                수정 페이지로 이동
              </AdminActionButton>
              <AdminActionButton
                variant="ghost"
                onClick={() => router.push(buildAdminEntityRoute(basePath, "list"), { scroll: false })}
                testId="activity-back-list"
              >
                목록으로
              </AdminActionButton>
            </div>
          </div>
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

            <section
              className="space-y-3 rounded-lg border border-gray-200 p-3"
              data-testid="activity-detail-manager"
            >
              <div>
                <h3 className="text-sm font-semibold">세부 이미지 관리</h3>
                <p className="text-xs text-gray-500">
                  파일 선택 창은 하나만 사용합니다. 선택한 이미지는 병렬로 업로드되며, 목록에서
                  미리보기와 순서를 함께 관리할 수 있습니다.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  카드의 드래그 핸들을 마우스로 잡아 순서를 바꿔 주세요.
                </p>
                <p className="mt-1 text-xs text-gray-500">선택된 활동: {selected.title}</p>
              </div>

              <BatchImageDropzone
                title="세부 이미지 추가"
                description="이미지를 끌어다 놓거나 클릭해 업로드할 수 있습니다."
                testId="activity-detail-create-image"
                disabled={isSubmitting}
                onFilesSelected={queueEditDetailFiles}
              />

              {detailBatchUpload.items.length > 0 ? (
                <div className="space-y-2" data-testid="activity-detail-upload-queue">
                  <p className="text-xs font-medium text-gray-700">업로드 대기/진행 이미지</p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {detailBatchUpload.items.map((item) => (
                      <li
                        key={item.id}
                        className={`relative aspect-[4/3] cursor-grab overflow-hidden rounded-md border border-gray-200 bg-gray-50 transition-shadow hover:shadow-sm active:cursor-grabbing ${
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
                        <DragReorderBadge compact className="absolute left-2 top-2 z-10" />
                        {item.status === "failed" ? (
                          <button
                            type="button"
                            onClick={() => detailBatchUpload.retryItem(item.id)}
                            className="absolute top-2 right-14 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-gray-700 hover:bg-white"
                          >
                            재시도
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => detailBatchUpload.removeItem(item.id)}
                          className="absolute top-2 right-2 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-red-700 hover:bg-white"
                        >
                          삭제
                        </button>
                        <span className="absolute left-2 bottom-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                          정렬 {item.sortOrder}
                        </span>
                        <span className="absolute right-2 bottom-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                          {item.status === "pending"
                            ? "준비"
                            : item.status === "uploading"
                              ? item.progress > 0
                                ? `${item.progress}%`
                                : "업로드"
                              : item.status === "uploaded"
                                ? "완료"
                                : "실패"}
                        </span>
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={`${item.fileName} 미리보기`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            업로드 중
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
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
                  업로드한 이미지 반영
                </AdminActionButton>
                <AdminActionButton
                  onClick={() => void handleSaveDetailImages()}
                  loading={activeSubmitAction === "saveDetailImages"}
                  disabled={!canSaveDetailImages}
                  loadingText="저장 중..."
                  testId="activity-detail-save-all"
                >
                  순서 저장
                </AdminActionButton>
              </div>

              {selected.detailImages.length === 0 ? (
                <p className="text-sm text-gray-500">등록된 세부 이미지가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    카드의 드래그 핸들을 마우스로 잡아 홈페이지 노출 순서를 변경할 수 있습니다.
                  </p>
                  <ul
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
                    data-testid="activity-detail-list"
                  >
                  {sortedSelectedDetailImages.map((image) => {
                    const imageUrl = detailDrafts[image.id]?.imageUrl ?? image.imageUrl;
                    const sortOrder = detailDrafts[image.id]?.sortOrder ?? image.sortOrder;

                    return (
                      <li
                        key={image.id}
                        className={`relative aspect-[4/3] cursor-grab overflow-hidden rounded-md border border-gray-200 bg-gray-50 transition-shadow hover:shadow-sm active:cursor-grabbing ${
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
                        <DragReorderBadge compact className="absolute left-2 top-2 z-10" />
                        <button
                          type="button"
                          onClick={() => {
                            if (!isSubmitting) {
                              setSelectedImageId(image.id);
                              setDeleteTarget("detail");
                            }
                          }}
                          className="absolute top-2 right-2 z-10 rounded-md bg-white/90 px-2 py-1 text-xs text-red-700 hover:bg-white"
                          data-testid={`activity-detail-delete-button-${image.id}`}
                        >
                          삭제
                        </button>
                        <span className="absolute left-2 bottom-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                          정렬 {sortOrder}
                        </span>
                        <Image
                          src={imageUrl}
                          alt={`${selected.title} 세부 이미지`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </li>
                    );
                  })}
                  </ul>
                </div>
              )}
            </section>

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
