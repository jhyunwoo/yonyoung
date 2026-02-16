"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS, uploadWithPresign } from "../../../../lib/admin-api/upload";
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
import AdminInfoBox from "../components/admin-info-box";
import AdminPageHeader from "../components/admin-page-header";
import ImageInput from "../components/image-input";

type ActivityFormState = {
  title: string;
  description: string;
  activityDate: string;
  generationId: string;
  coverImageUrl: string;
};

type DetailImageFormState = {
  imageUrl: string;
  sortOrder: string;
};

const emptyActivityForm: ActivityFormState = {
  title: "",
  description: "",
  activityDate: "",
  generationId: "",
  coverImageUrl: "",
};

const emptyDetailForm: DetailImageFormState = {
  imageUrl: "",
  sortOrder: "0",
};

type ActivitiesAdminPageProps = {
  generationScoped?: boolean;
  generationSortOrder?: number | null;
};

/**
 * ActivitiesAdminPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  generationScoped = false,
  generationSortOrder = null,
} 함수 로직에서 사용하는 입력값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 리렌더링 타이밍에 따라 훅 의존성 배열을 신중히 관리해야 합니다.
 */
export default function ActivitiesAdminPage({
  generationScoped = false,
  generationSortOrder = null,
}: ActivitiesAdminPageProps = {}) {
  const [items, setItems] = useState<ApiActivity[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<ActivityFormState>(emptyActivityForm);
  const [editForm, setEditForm] = useState<ActivityFormState>(emptyActivityForm);
  const [detailCreateForm, setDetailCreateForm] = useState<DetailImageFormState>(emptyDetailForm);
  const [detailEditForm, setDetailEditForm] = useState<DetailImageFormState>(emptyDetailForm);

  const [createCoverFile, setCreateCoverFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [detailCreateFile, setDetailCreateFile] = useState<File | null>(null);
  const [detailEditFile, setDetailEditFile] = useState<File | null>(null);
  const [createCoverUploadProgress, setCreateCoverUploadProgress] = useState<number | null>(null);
  const [editCoverUploadProgress, setEditCoverUploadProgress] = useState<number | null>(null);
  const [detailCreateUploadProgress, setDetailCreateUploadProgress] = useState<number | null>(null);
  const [detailEditUploadProgress, setDetailEditUploadProgress] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubmitAction, setActiveSubmitAction] = useState<
    "createActivity" | "deleteActivity" | "createDetailImage" | "deleteDetailImage" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<"activity" | "detail" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;

  const selected = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => items.find(/** items.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedImage = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => selected?.detailImages.find(/** selected?.detailImages.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param image 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (image) => image.id === selectedImageId) ?? null,
    [selected, selectedImageId],
  );

    /**
   * syncActivityEditForm의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const syncActivityEditForm = (item: ApiActivity | null) => {
    if (!item) {
      setEditForm(emptyActivityForm);
      return;
    }

    setEditForm({
      title: item.title,
      description: item.description,
      activityDate: toDateInputValue(item.activityDate),
      generationId: item.generationId,
      coverImageUrl: item.coverImageUrl,
    });
  };

    /**
   * syncDetailEditForm의 핵심 비즈니스 로직을 수행합니다.
   * @param image 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const syncDetailEditForm = (image: ApiActivityImage | null) => {
    if (!image) {
      setDetailEditForm(emptyDetailForm);
      return;
    }

    setDetailEditForm({
      imageUrl: image.imageUrl,
      sortOrder: String(image.sortOrder),
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
      const [activities, generationList] = await Promise.all([
        adminResourceApi.listActivities(),
        adminResourceApi.listGenerations(),
      ]);

      const nextScopedGeneration = generationScoped
        ? generationList.find(/** generationList.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => generation.sortOrder === generationSortOrder) ?? null
        : null;

      const visibleGenerations = generationScoped
        ? nextScopedGeneration
          ? [nextScopedGeneration]
          : []
        : generationList;
      const visibleActivities =
        generationScoped && nextScopedGeneration
          ? activities.filter(
                            /**
               * activities.filter 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
               * @param activity 함수 로직에서 사용하는 입력값입니다.
               * @returns 함수 실행 결과를 반환합니다.
               * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
               */
              (activity) => activity.generationId === nextScopedGeneration.id,
            )
          : generationScoped
            ? []
            : activities;

      setScopedGeneration(nextScopedGeneration);
      setItems(visibleActivities);
      setGenerations(visibleGenerations);

      setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({
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
        return;
      }

      if (visibleActivities.length === 0) {
        setSelectedId(null);
        setSelectedImageId(null);
        syncActivityEditForm(null);
        syncDetailEditForm(null);
        return;
      }

      const fallbackId = visibleActivities[0]?.id;
      if (!fallbackId) {
        setSelectedId(null);
        setSelectedImageId(null);
        syncActivityEditForm(null);
        syncDetailEditForm(null);
        return;
      }

      const nextSelectedId =
        selectedId && visibleActivities.some(/** visibleActivities.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === selectedId)
          ? selectedId
          : fallbackId;

      setSelectedId(nextSelectedId);
      const selectedActivity =
        visibleActivities.find(/** visibleActivities.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => item.id === nextSelectedId) ?? null;
      syncActivityEditForm(selectedActivity);

      const nextImageId =
        selectedImageId && selectedActivity?.detailImages.some(/** selectedActivity?.detailImages.some 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param image 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (image) => image.id === selectedImageId)
          ? selectedImageId
          : selectedActivity?.detailImages[0]?.id ?? null;

      setSelectedImageId(nextImageId);
      syncDetailEditForm(
        nextImageId
          ? selectedActivity?.detailImages.find(/** selectedActivity?.detailImages.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param image 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (image) => image.id === nextImageId) ?? null
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
  }, [generationScoped, generationSortOrder]);

    /**
   * handleSelectActivity의 핵심 비즈니스 로직을 수행합니다.
   * @param item 반복 처리 중인 현재 항목입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSelectActivity = (item: ApiActivity) => {
    setSelectedId(item.id);
    syncActivityEditForm(item);
    const firstImage = item.detailImages[0] ?? null;
    setSelectedImageId(firstImage?.id ?? null);
    syncDetailEditForm(firstImage);
    setEditCoverFile(null);
    setDetailEditFile(null);
    setEditCoverUploadProgress(null);
    setDetailEditUploadProgress(null);
  };

    /**
   * handleSelectDetailImage의 핵심 비즈니스 로직을 수행합니다.
   * @param image 함수 로직에서 사용하는 입력값입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleSelectDetailImage = (image: ApiActivityImage) => {
    setSelectedImageId(image.id);
    syncDetailEditForm(image);
    setDetailEditFile(null);
    setDetailEditUploadProgress(null);
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
    setActiveSubmitAction("createActivity");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!createCoverFile) {
        throw new Error("대표 이미지 파일을 선택해 주세요.");
      }

      setCreateCoverUploadProgress(0);
      const coverImageUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.activityCover,
        file: createCoverFile,
        onProgress: setCreateCoverUploadProgress,
      });

      await adminResourceApi.createActivity({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        activityDate: toTimestampMs(createForm.activityDate),
        coverImageUrl,
        generationId: scopedGenerationId ?? createForm.generationId,
      });

      setCreateForm({
        ...emptyActivityForm,
        generationId: scopedGenerationId ?? generations[0]?.id ?? "",
      });
      setCreateCoverFile(null);
      setCreateCoverUploadProgress(null);
      setSuccessMessage("활동을 생성했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setCreateCoverUploadProgress(null);
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
      const coverImageUrl = editCoverFile
        ? await (async () => {
            setEditCoverUploadProgress(0);
            return uploadWithPresign({
              presignPath: PRESIGN_PATHS.activityCover,
              file: editCoverFile,
              onProgress: setEditCoverUploadProgress,
            });
          })()
        : editForm.coverImageUrl;

      await adminResourceApi.updateActivity(selected.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        activityDate: toTimestampMs(editForm.activityDate),
        coverImageUrl,
        generationId: scopedGenerationId ?? editForm.generationId,
      });

      setSuccessMessage("활동을 수정했습니다.");
      setEditCoverFile(null);
      setEditCoverUploadProgress(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setEditCoverUploadProgress(null);
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
    setActiveSubmitAction("deleteActivity");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteActivity(selected.id);
      setSuccessMessage("활동을 삭제했습니다.");
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
   * handleCreateDetailImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleCreateDetailImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setActiveSubmitAction("createDetailImage");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!detailCreateFile) {
        throw new Error("세부 이미지 파일을 선택해 주세요.");
      }

      setDetailCreateUploadProgress(0);
      const imageUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.activityDetail,
        file: detailCreateFile,
        onProgress: setDetailCreateUploadProgress,
      });

      await adminResourceApi.addActivityImage(selected.id, {
        imageUrl,
        sortOrder: toPositiveInteger(detailCreateForm.sortOrder, "sortOrder"),
      });

      setDetailCreateForm(emptyDetailForm);
      setDetailCreateFile(null);
      setDetailCreateUploadProgress(null);
      setSuccessMessage("세부 이미지를 추가했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setDetailCreateUploadProgress(null);
    }
  };

    /**
   * handleUpdateDetailImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @param event 함수 로직에서 사용하는 입력값입니다.
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
  const handleUpdateDetailImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !selectedImage) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const imageUrl = detailEditFile
        ? await (async () => {
            setDetailEditUploadProgress(0);
            return uploadWithPresign({
              presignPath: PRESIGN_PATHS.activityDetail,
              file: detailEditFile,
              onProgress: setDetailEditUploadProgress,
            });
          })()
        : detailEditForm.imageUrl;

      await adminResourceApi.updateActivityImage(selected.id, selectedImage.id, {
        imageUrl,
        sortOrder: toPositiveInteger(detailEditForm.sortOrder, "sortOrder"),
      });

      setSuccessMessage("세부 이미지를 수정했습니다.");
      setDetailEditFile(null);
      setDetailEditUploadProgress(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
      setDetailEditUploadProgress(null);
    }
  };

    /**
   * handleDeleteDetailImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
   * @returns 비동기 처리 결과를 Promise로 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setActiveSubmitAction(null);
    }
  };

  const openDeleteActivityModal = () => {
    if (!selected || isSubmitting) {
      return;
    }
    setDeleteTarget("activity");
  };

  const openDeleteDetailImageModal = () => {
    if (!selected || !selectedImage || isSubmitting) {
      return;
    }
    setDeleteTarget("detail");
  };

  return (
    <div className="space-y-6" data-testid="activities-page">
      <AdminPageHeader
        title="활동 관리"
        description="활동 정보와 활동 상세 이미지를 등록해 홈페이지 콘텐츠를 구성하는 화면입니다."
        guidance="활동을 먼저 만든 뒤 상세 이미지를 추가하면 완성된 활동 페이지를 쉽게 구성할 수 있습니다."
      >
        {generationScoped ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="activities-scoped-generation">
            {scopedGeneration
              ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
              : "현재 기수를 확인하는 중..."}
          </p>
        ) : null}
      </AdminPageHeader>

      <AdminInfoBox title="작업 안내">
        설명 문구는 방문자가 읽는 본문으로 사용됩니다. 날짜와 소속 기수를 정확히 지정해 주세요.
      </AdminInfoBox>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="activities-error">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="activities-success">
          {successMessage}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">활동 목록</h2>
            <button
              type="button"
              onClick={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => void loadData()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="activities-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">아직 등록된 활동이 없습니다. 오른쪽에서 먼저 만들어 주세요.</p>
          ) : (
            <ul className="space-y-2" data-testid="activities-list">
              {items.map(/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`activity-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">소속 기수 ID: {item.generationId}</p>
                      <p className="text-xs text-gray-500">활동 날짜: {formatTimestamp(item.activityDate)}</p>
                      <p className="text-xs text-gray-500">세부 이미지 수: {item.detailImages.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={/** items.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => handleSelectActivity(item)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        selectedId === item.id
                          ? "bg-black text-white"
                          : "border border-gray-300 text-gray-700"
                      }`}
                      data-testid={`activity-select-${item.id}`}
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
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="activity-create-form">
            <h2 className="mb-3 text-lg font-semibold">활동 만들기</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">활동 제목</span>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, title: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-create-title"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">활동 설명</span>
                <textarea
                  value={createForm.description}
                  onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, description: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-create-description"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">활동 날짜</span>
                <input
                  type="date"
                  value={createForm.activityDate}
                  onChange={/** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, activityDate: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-create-date"
                />
              </label>

              {scopedGenerationId ? (
                <div
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  data-testid="activity-scoped-generation-field"
                >
                  소속 기수는 현재 선택한 기수로 고정됩니다.
                </div>
              ) : (
                <label className="block text-sm">
                  <span className="mb-1 block">소속 기수</span>
                  <select
                    value={createForm.generationId}
                    onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                      setCreateForm(/** setCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({
                        ...previous,
                        generationId: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                    data-testid="activity-create-generation-id"
                  >
                    <option value="">선택</option>
                    {generations.map(/** generations.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => (
                      <option key={generation.id} value={generation.id}>
                        {generation.name} ({generation.sortOrder})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <ImageInput
                label="대표 이미지"
                file={createCoverFile}
                onFileChange={setCreateCoverFile}
                uploadProgress={createCoverUploadProgress}
                isUploading={createCoverUploadProgress !== null}
                testIdPrefix="activity-create-cover"
                disabled={isSubmitting}
              />
            </div>

            <AdminActionButton
              type="submit"
              loading={activeSubmitAction === "createActivity"}
              disabled={isSubmitting && activeSubmitAction !== "createActivity"}
              loadingText="활동 생성 중..."
              className="mt-4"
              testId="activity-create-submit"
            >
              활동 생성
            </AdminActionButton>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="activity-edit-form">
            <h2 className="mb-3 text-lg font-semibold">선택한 활동 수정/삭제</h2>
            {selected ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block">활동 제목</span>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, title: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="activity-edit-title"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">활동 설명</span>
                    <textarea
                      value={editForm.description}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, description: event.target.value }))
                      }
                      className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="activity-edit-description"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">활동 날짜</span>
                    <input
                      type="date"
                      value={editForm.activityDate}
                      onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                        setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, activityDate: event.target.value }))
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
                        onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                          setEditForm(/** setEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({
                            ...previous,
                            generationId: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="activity-edit-generation-id"
                      >
                        <option value="">선택</option>
                        {generations.map(/** generations.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => (
                          <option key={generation.id} value={generation.id}>
                            {generation.name} ({generation.sortOrder})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <ImageInput
                    label="대표 이미지"
                    file={editCoverFile}
                    onFileChange={setEditCoverFile}
                    uploadProgress={editCoverUploadProgress}
                    isUploading={editCoverUploadProgress !== null}
                    testIdPrefix="activity-edit-cover"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <AdminActionButton
                    type="submit"
                    disabled={isSubmitting}
                    testId="activity-edit-submit"
                  >
                    수정 저장
                  </AdminActionButton>
                  <AdminActionButton
                    variant="danger"
                    onClick={openDeleteActivityModal}
                    disabled={isSubmitting}
                    testId="activity-delete-button"
                  >
                    활동 삭제
                  </AdminActionButton>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 활동을 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleCreateDetailImage}
          className="rounded-lg border border-gray-200 bg-white p-4"
          data-testid="activity-detail-create-form"
        >
          <h2 className="mb-3 text-lg font-semibold">세부 이미지 추가</h2>
          {selected ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">선택된 활동: {selected.title}</p>
              <ImageInput
                label="세부 이미지"
                file={detailCreateFile}
                onFileChange={setDetailCreateFile}
                uploadProgress={detailCreateUploadProgress}
                isUploading={detailCreateUploadProgress !== null}
                testIdPrefix="activity-detail-create-image"
                disabled={isSubmitting}
              />
              <label className="block text-sm">
                <span className="mb-1 block">표시 순서 (작을수록 먼저 보여요)</span>
                <input
                  type="number"
                  min={0}
                  value={detailCreateForm.sortOrder}
                  onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                    setDetailCreateForm(/** setDetailCreateForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, sortOrder: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="activity-detail-create-sort-order"
                />
              </label>
              <AdminActionButton
                type="submit"
                loading={activeSubmitAction === "createDetailImage"}
                disabled={isSubmitting && activeSubmitAction !== "createDetailImage"}
                loadingText="이미지 추가 중..."
                testId="activity-detail-create-submit"
              >
                이미지 추가
              </AdminActionButton>
            </div>
          ) : (
            <p className="text-sm text-gray-500">활동을 먼저 선택해 주세요.</p>
          )}
        </form>

        <article className="rounded-lg border border-gray-200 bg-white p-4" data-testid="activity-detail-edit-card">
          <h2 className="mb-3 text-lg font-semibold">세부 이미지 수정/삭제</h2>
          {selected ? (
            <>
              {selected.detailImages.length === 0 ? (
                <p className="text-sm text-gray-500">세부 이미지가 없습니다.</p>
              ) : (
                <ul className="mb-4 space-y-2" data-testid="activity-detail-list">
                  {selected.detailImages.map(/** selected.detailImages.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param image 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (image) => (
                    <li key={image.id} className="rounded-md border border-gray-200 p-2" data-testid={`activity-detail-row-${image.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-600">표시 순서: {image.sortOrder}</p>
                          <p className="truncate text-xs text-gray-500">{image.imageUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={/** selected.detailImages.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => handleSelectDetailImage(image)}
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            selectedImageId === image.id
                              ? "bg-black text-white"
                              : "border border-gray-300 text-gray-700"
                          }`}
                          data-testid={`activity-detail-select-${image.id}`}
                        >
                          {selectedImageId === image.id ? "선택됨" : "선택"}
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
                      file={detailEditFile}
                      onFileChange={setDetailEditFile}
                      uploadProgress={detailEditUploadProgress}
                      isUploading={detailEditUploadProgress !== null}
                      testIdPrefix="activity-detail-edit-image"
                      disabled={isSubmitting}
                    />
                    <label className="block text-sm">
                      <span className="mb-1 block">표시 순서 (작을수록 먼저 보여요)</span>
                      <input
                        type="number"
                        min={0}
                        value={detailEditForm.sortOrder}
                        onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) =>
                          setDetailEditForm(/** setDetailEditForm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param previous 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (previous) => ({ ...previous, sortOrder: event.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="activity-detail-edit-sort-order"
                      />
                    </label>
                    <div className="flex gap-2">
                      <AdminActionButton
                        type="submit"
                        disabled={isSubmitting}
                        testId="activity-detail-edit-submit"
                      >
                        수정 저장
                      </AdminActionButton>
                      <AdminActionButton
                        variant="danger"
                        onClick={openDeleteDetailImageModal}
                        disabled={isSubmitting}
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
            </>
          ) : (
            <p className="text-sm text-gray-500">활동을 먼저 선택해 주세요.</p>
          )}
        </article>
      </section>

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
        onConfirm={/** onConfirm 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
          if (deleteTarget === "detail") {
            void handleDeleteDetailImage();
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
