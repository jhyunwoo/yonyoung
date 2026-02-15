"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { PRESIGN_PATHS, resolveImageValue } from "../../../../lib/admin-api/upload";
import type {
  ApiExhibition,
  ApiExhibitionImage,
  ApiGeneration,
} from "../../../../lib/admin-api/types";
import {
  formatTimestamp,
  readErrorMessage,
  toDateInputValue,
  toPositiveInteger,
  toTimestampMs,
} from "../components/admin-form-utils";
import ImageInput, { type ImageInputMode } from "../components/image-input";

type ExhibitionFormState = {
  title: string;
  startDate: string;
  endDate: string;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
};

type DetailImageFormState = {
  imageUrl: string;
  sortOrder: string;
};

const emptyExhibitionForm: ExhibitionFormState = {
  title: "",
  startDate: "",
  endDate: "",
  generationId: "",
  place: "",
  coverImageUrl: "",
  description: "",
};

const emptyDetailForm: DetailImageFormState = {
  imageUrl: "",
  sortOrder: "0",
};

type ExhibitionsAdminPageProps = {
  generationScoped?: boolean;
  generationSortOrder?: number | null;
};

export default function ExhibitionsAdminPage({
  generationScoped = false,
  generationSortOrder = null,
}: ExhibitionsAdminPageProps = {}) {
  const [items, setItems] = useState<ApiExhibition[]>([]);
  const [generations, setGenerations] = useState<ApiGeneration[]>([]);
  const [scopedGeneration, setScopedGeneration] = useState<ApiGeneration | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<ExhibitionFormState>(emptyExhibitionForm);
  const [editForm, setEditForm] = useState<ExhibitionFormState>(emptyExhibitionForm);
  const [detailCreateForm, setDetailCreateForm] = useState<DetailImageFormState>(emptyDetailForm);
  const [detailEditForm, setDetailEditForm] = useState<DetailImageFormState>(emptyDetailForm);

  const [createCoverMode, setCreateCoverMode] = useState<ImageInputMode>("url");
  const [editCoverMode, setEditCoverMode] = useState<ImageInputMode>("url");
  const [detailCreateMode, setDetailCreateMode] = useState<ImageInputMode>("url");
  const [detailEditMode, setDetailEditMode] = useState<ImageInputMode>("url");

  const [createCoverFile, setCreateCoverFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [detailCreateFile, setDetailCreateFile] = useState<File | null>(null);
  const [detailEditFile, setDetailEditFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scopedGenerationId = generationScoped ? scopedGeneration?.id ?? null : null;

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const selectedImage = useMemo(
    () => selected?.detailImages.find((image) => image.id === selectedImageId) ?? null,
    [selected, selectedImageId],
  );

  const syncEditForm = (item: ApiExhibition | null) => {
    if (!item) {
      setEditForm(emptyExhibitionForm);
      return;
    }

    setEditForm({
      title: item.title,
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
      generationId: item.generationId,
      place: item.place,
      coverImageUrl: item.coverImageUrl,
      description: item.description,
    });
  };

  const syncDetailEditForm = (image: ApiExhibitionImage | null) => {
    if (!image) {
      setDetailEditForm(emptyDetailForm);
      return;
    }

    setDetailEditForm({
      imageUrl: image.imageUrl,
      sortOrder: String(image.sortOrder),
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [exhibitions, generationList] = await Promise.all([
        adminResourceApi.listExhibitions(),
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
      const visibleExhibitions =
        generationScoped && nextScopedGeneration
          ? exhibitions.filter(
              (exhibition) =>
                exhibition.generationId === nextScopedGeneration.id,
            )
          : generationScoped
            ? []
            : exhibitions;

      setScopedGeneration(nextScopedGeneration);
      setItems(visibleExhibitions);
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
        syncEditForm(null);
        syncDetailEditForm(null);
        setErrorMessage("선택한 기수를 찾을 수 없습니다.");
        return;
      }

      if (visibleExhibitions.length === 0) {
        setSelectedId(null);
        setSelectedImageId(null);
        syncEditForm(null);
        syncDetailEditForm(null);
        return;
      }

      const fallbackId = visibleExhibitions[0]?.id;
      if (!fallbackId) {
        setSelectedId(null);
        setSelectedImageId(null);
        syncEditForm(null);
        syncDetailEditForm(null);
        return;
      }

      const nextSelectedId =
        selectedId && visibleExhibitions.some((item) => item.id === selectedId)
          ? selectedId
          : fallbackId;
      setSelectedId(nextSelectedId);

      const selectedExhibition =
        visibleExhibitions.find((item) => item.id === nextSelectedId) ?? null;
      syncEditForm(selectedExhibition);

      const nextImageId =
        selectedImageId &&
        selectedExhibition?.detailImages.some((image) => image.id === selectedImageId)
          ? selectedImageId
          : selectedExhibition?.detailImages[0]?.id ?? null;
      setSelectedImageId(nextImageId);

      syncDetailEditForm(
        nextImageId
          ? selectedExhibition?.detailImages.find((image) => image.id === nextImageId) ?? null
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

  const handleSelect = (item: ApiExhibition) => {
    setSelectedId(item.id);
    syncEditForm(item);
    const firstImage = item.detailImages[0] ?? null;
    setSelectedImageId(firstImage?.id ?? null);
    syncDetailEditForm(firstImage);
    setEditCoverMode("url");
    setEditCoverFile(null);
    setDetailEditMode("url");
    setDetailEditFile(null);
  };

  const handleSelectImage = (image: ApiExhibitionImage) => {
    setSelectedImageId(image.id);
    syncDetailEditForm(image);
    setDetailEditMode("url");
    setDetailEditFile(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const coverImageUrl = await resolveImageValue({
        mode: createCoverMode,
        urlValue: createForm.coverImageUrl,
        file: createCoverFile,
        presignPath: PRESIGN_PATHS.exhibitionCover,
        fieldLabel: "대표 이미지",
      });

      await adminResourceApi.createExhibition({
        title: createForm.title.trim(),
        startDate: toTimestampMs(createForm.startDate),
        endDate: toTimestampMs(createForm.endDate),
        generationId: scopedGenerationId ?? createForm.generationId,
        place: createForm.place.trim(),
        coverImageUrl,
        description: createForm.description.trim(),
      });

      setCreateForm({
        ...emptyExhibitionForm,
        generationId: scopedGenerationId ?? generations[0]?.id ?? "",
      });
      setCreateCoverMode("url");
      setCreateCoverFile(null);
      setSuccessMessage("전시를 생성했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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
      const coverImageUrl = await resolveImageValue({
        mode: editCoverMode,
        urlValue: editForm.coverImageUrl,
        file: editCoverFile,
        presignPath: PRESIGN_PATHS.exhibitionCover,
        fieldLabel: "대표 이미지",
      });

      await adminResourceApi.updateExhibition(selected.id, {
        title: editForm.title.trim(),
        startDate: toTimestampMs(editForm.startDate),
        endDate: toTimestampMs(editForm.endDate),
        generationId: scopedGenerationId ?? editForm.generationId,
        place: editForm.place.trim(),
        coverImageUrl,
        description: editForm.description.trim(),
      });

      setSuccessMessage("전시를 수정했습니다.");
      setEditCoverMode("url");
      setEditCoverFile(null);
      await loadData();
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

    if (!window.confirm("선택한 전시를 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteExhibition(selected.id);
      setSuccessMessage("전시를 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDetailImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const imageUrl = await resolveImageValue({
        mode: detailCreateMode,
        urlValue: detailCreateForm.imageUrl,
        file: detailCreateFile,
        presignPath: PRESIGN_PATHS.exhibitionDetail,
        fieldLabel: "세부 이미지",
      });

      await adminResourceApi.addExhibitionImage(selected.id, {
        imageUrl,
        sortOrder: toPositiveInteger(detailCreateForm.sortOrder, "sortOrder"),
      });

      setDetailCreateForm(emptyDetailForm);
      setDetailCreateMode("url");
      setDetailCreateFile(null);
      setSuccessMessage("세부 이미지를 추가했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDetailImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !selectedImage) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const imageUrl = await resolveImageValue({
        mode: detailEditMode,
        urlValue: detailEditForm.imageUrl,
        file: detailEditFile,
        presignPath: PRESIGN_PATHS.exhibitionDetail,
        fieldLabel: "세부 이미지",
      });

      await adminResourceApi.updateExhibitionImage(selected.id, selectedImage.id, {
        imageUrl,
        sortOrder: toPositiveInteger(detailEditForm.sortOrder, "sortOrder"),
      });

      setSuccessMessage("세부 이미지를 수정했습니다.");
      setDetailEditMode("url");
      setDetailEditFile(null);
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDetailImage = async () => {
    if (!selected || !selectedImage) {
      return;
    }

    if (!window.confirm("선택한 세부 이미지를 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await adminResourceApi.deleteExhibitionImage(selected.id, selectedImage.id);
      setSuccessMessage("세부 이미지를 삭제했습니다.");
      await loadData();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="exhibitions-page">
      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Exhibitions</h1>
        <p className="mt-1 text-sm text-gray-600">전시 CRUD 및 세부 이미지 CRUD를 관리합니다.</p>
        {generationScoped ? (
          <p className="mt-1 text-xs text-gray-500" data-testid="exhibitions-scoped-generation">
            {scopedGeneration
              ? `현재 기수: ${scopedGeneration.sortOrder}기 (${scopedGeneration.name})`
              : "현재 기수를 확인하는 중..."}
          </p>
        ) : null}
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="exhibitions-error">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700" data-testid="exhibitions-success">
          {successMessage}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">목록</h2>
            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
              data-testid="exhibitions-reload-button"
            >
              새로고침
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">데이터가 없습니다.</p>
          ) : (
            <ul className="space-y-2" data-testid="exhibitions-list">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-gray-200 p-3" data-testid={`exhibition-row-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-gray-500">place: {item.place}</p>
                      <p className="text-xs text-gray-500">generationId: {item.generationId}</p>
                      <p className="text-xs text-gray-500">period: {formatTimestamp(item.startDate)} ~ {formatTimestamp(item.endDate)}</p>
                      <p className="text-xs text-gray-500">detailImages: {item.detailImages.length}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        selectedId === item.id
                          ? "bg-black text-white"
                          : "border border-gray-300 text-gray-700"
                      }`}
                      data-testid={`exhibition-select-${item.id}`}
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
          <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="exhibition-create-form">
            <h2 className="mb-3 text-lg font-semibold">전시 생성</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">title</span>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, title: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="exhibition-create-title"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">startDate</span>
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, startDate: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="exhibition-create-start-date"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">endDate</span>
                <input
                  type="date"
                  value={createForm.endDate}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, endDate: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="exhibition-create-end-date"
                />
              </label>

              {scopedGenerationId ? (
                <div
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  data-testid="exhibition-scoped-generation-field"
                >
                  generationId는 현재 기수로 고정됩니다.
                </div>
              ) : (
                <label className="block text-sm">
                  <span className="mb-1 block">generationId</span>
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
                    data-testid="exhibition-create-generation-id"
                  >
                    <option value="">선택</option>
                    {generations.map((generation) => (
                      <option key={generation.id} value={generation.id}>
                        {generation.name} ({generation.sortOrder})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm">
                <span className="mb-1 block">place</span>
                <input
                  type="text"
                  value={createForm.place}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, place: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="exhibition-create-place"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block">description</span>
                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, description: event.target.value }))
                  }
                  className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="exhibition-create-description"
                />
              </label>

              <ImageInput
                label="coverImageUrl"
                mode={createCoverMode}
                onModeChange={setCreateCoverMode}
                urlValue={createForm.coverImageUrl}
                onUrlChange={(value) =>
                  setCreateForm((previous) => ({ ...previous, coverImageUrl: value }))
                }
                file={createCoverFile}
                onFileChange={setCreateCoverFile}
                testIdPrefix="exhibition-create-cover"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              data-testid="exhibition-create-submit"
            >
              생성
            </button>
          </form>

          <form onSubmit={handleUpdate} className="rounded-lg border border-gray-200 bg-white p-4" data-testid="exhibition-edit-form">
            <h2 className="mb-3 text-lg font-semibold">전시 수정/삭제</h2>
            {selected ? (
              <>
                <div className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block">title</span>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, title: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="exhibition-edit-title"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">startDate</span>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, startDate: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="exhibition-edit-start-date"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">endDate</span>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, endDate: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="exhibition-edit-end-date"
                    />
                  </label>

                  {scopedGenerationId ? (
                    <div
                      className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                      data-testid="exhibition-edit-scoped-generation-field"
                    >
                      generationId는 현재 기수로 고정됩니다.
                    </div>
                  ) : (
                    <label className="block text-sm">
                      <span className="mb-1 block">generationId</span>
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
                        data-testid="exhibition-edit-generation-id"
                      >
                        <option value="">선택</option>
                        {generations.map((generation) => (
                          <option key={generation.id} value={generation.id}>
                            {generation.name} ({generation.sortOrder})
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block text-sm">
                    <span className="mb-1 block">place</span>
                    <input
                      type="text"
                      value={editForm.place}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, place: event.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="exhibition-edit-place"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block">description</span>
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((previous) => ({ ...previous, description: event.target.value }))
                      }
                      className="min-h-24 w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                      data-testid="exhibition-edit-description"
                    />
                  </label>

                  <ImageInput
                    label="coverImageUrl"
                    mode={editCoverMode}
                    onModeChange={setEditCoverMode}
                    urlValue={editForm.coverImageUrl}
                    onUrlChange={(value) =>
                      setEditForm((previous) => ({ ...previous, coverImageUrl: value }))
                    }
                    file={editCoverFile}
                    onFileChange={setEditCoverFile}
                    testIdPrefix="exhibition-edit-cover"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    data-testid="exhibition-edit-submit"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                    data-testid="exhibition-delete-button"
                  >
                    삭제
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">수정할 전시를 선택해 주세요.</p>
            )}
          </form>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleCreateDetailImage}
          className="rounded-lg border border-gray-200 bg-white p-4"
          data-testid="exhibition-detail-create-form"
        >
          <h2 className="mb-3 text-lg font-semibold">세부 이미지 추가</h2>
          {selected ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">선택된 전시: {selected.title}</p>
              <ImageInput
                label="imageUrl"
                mode={detailCreateMode}
                onModeChange={setDetailCreateMode}
                urlValue={detailCreateForm.imageUrl}
                onUrlChange={(value) =>
                  setDetailCreateForm((previous) => ({ ...previous, imageUrl: value }))
                }
                file={detailCreateFile}
                onFileChange={setDetailCreateFile}
                testIdPrefix="exhibition-detail-create-image"
                disabled={isSubmitting}
              />
              <label className="block text-sm">
                <span className="mb-1 block">sortOrder</span>
                <input
                  type="number"
                  min={0}
                  value={detailCreateForm.sortOrder}
                  onChange={(event) =>
                    setDetailCreateForm((previous) => ({ ...previous, sortOrder: event.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  data-testid="exhibition-detail-create-sort-order"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                data-testid="exhibition-detail-create-submit"
              >
                추가
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">전시를 먼저 선택해 주세요.</p>
          )}
        </form>

        <article className="rounded-lg border border-gray-200 bg-white p-4" data-testid="exhibition-detail-edit-card">
          <h2 className="mb-3 text-lg font-semibold">세부 이미지 수정/삭제</h2>
          {selected ? (
            <>
              {selected.detailImages.length === 0 ? (
                <p className="text-sm text-gray-500">세부 이미지가 없습니다.</p>
              ) : (
                <ul className="mb-4 space-y-2" data-testid="exhibition-detail-list">
                  {selected.detailImages.map((image) => (
                    <li key={image.id} className="rounded-md border border-gray-200 p-2" data-testid={`exhibition-detail-row-${image.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-600">sortOrder: {image.sortOrder}</p>
                          <p className="truncate text-xs text-gray-500">{image.imageUrl}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectImage(image)}
                          className={`rounded-md px-2 py-1 text-xs font-medium ${
                            selectedImageId === image.id
                              ? "bg-black text-white"
                              : "border border-gray-300 text-gray-700"
                          }`}
                          data-testid={`exhibition-detail-select-${image.id}`}
                        >
                          {selectedImageId === image.id ? "선택됨" : "선택"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleUpdateDetailImage} className="space-y-3" data-testid="exhibition-detail-edit-form">
                {selectedImage ? (
                  <>
                    <ImageInput
                      label="imageUrl"
                      mode={detailEditMode}
                      onModeChange={setDetailEditMode}
                      urlValue={detailEditForm.imageUrl}
                      onUrlChange={(value) =>
                        setDetailEditForm((previous) => ({ ...previous, imageUrl: value }))
                      }
                      file={detailEditFile}
                      onFileChange={setDetailEditFile}
                      testIdPrefix="exhibition-detail-edit-image"
                      disabled={isSubmitting}
                    />
                    <label className="block text-sm">
                      <span className="mb-1 block">sortOrder</span>
                      <input
                        type="number"
                        min={0}
                        value={detailEditForm.sortOrder}
                        onChange={(event) =>
                          setDetailEditForm((previous) => ({ ...previous, sortOrder: event.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        required
                        data-testid="exhibition-detail-edit-sort-order"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        data-testid="exhibition-detail-edit-submit"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteDetailImage}
                        disabled={isSubmitting}
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                        data-testid="exhibition-detail-delete-button"
                      >
                        삭제
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">수정할 세부 이미지를 선택해 주세요.</p>
                )}
              </form>
            </>
          ) : (
            <p className="text-sm text-gray-500">전시를 먼저 선택해 주세요.</p>
          )}
        </article>
      </section>
    </div>
  );
}
