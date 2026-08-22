"use client";

import { type ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiActivity } from "@/shared/contracts/api-contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import {
  createExistingUploadImageItem,
  readFileList,
} from "@/features/media/upload/image-upload-state";
import {
  readNewUploadImageItems,
  uploadDetailImages,
} from "@/features/media/upload/detail-image-upload";
import { createWeightedUploadProgressTracker } from "@/features/media/upload/weighted-upload-progress";
import { useSelectedImageFile } from "@/features/media/upload/use-selected-image-file";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import {
  formatTimestampToDateInput,
  readActivityErrorMessage,
  validateActivityDateRange,
} from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";

type ActivityEditFormProps = {
  activity: ApiActivity;
  generationId: string;
  generationName: string;
  generationPath: string;
  initialMessage: string | null;
};

/** 정렬은 서버 응답 순서에 의존하지 않고 sortOrder로 다시 고정한다. */
const toSortedDetailImageItems = (activity: ApiActivity) =>
  activity.detailImages
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image) =>
      createExistingUploadImageItem({
        id: image.id,
        imageUrl: image.imageUrl,
      }),
    );

export default function ActivityEditForm({
  activity,
  generationId,
  generationName,
  generationPath,
  initialMessage,
}: ActivityEditFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(initialMessage);

  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description);
  const [startDateInput, setStartDateInput] = useState(
    formatTimestampToDateInput(activity.startDate),
  );
  const [endDateInput, setEndDateInput] = useState(
    formatTimestampToDateInput(activity.endDate),
  );
  const {
    selectedFile: coverFile,
    fileInputRef: coverFileInputRef,
    previewUrl: coverPreviewUrl,
    selectFile: selectCoverFile,
    openFilePicker: openCoverFilePicker,
  } = useSelectedImageFile();
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    items: detailImages,
    appendFiles,
    removeItemById,
    reorderByIds,
  } = useImageUploadState({ initialItems: toSortedDetailImageItems(activity) });
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);

  const isSubmitDisabled =
    isSaving ||
    title.trim().length === 0 ||
    !hasMeaningfulRichTextHtml(description) ||
    startDateInput.trim().length === 0 ||
    endDateInput.trim().length === 0;

  const handleAddDetailFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = readFileList(event.target.files);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    appendFiles(files);
  };

  const handleOpenCoverFilePicker = () => {
    if (isSaving) {
      return;
    }

    openCoverFilePicker();
  };

  const handleOpenDetailFilePicker = () => {
    if (isSaving) {
      return;
    }

    detailFileInputRef.current?.click();
  };

  const handleRemoveDetailImage = (imageId: string) => {
    const targetExistingId = detailImages.find(
      (image) => image.id === imageId && image.source === "existing",
    )?.id;
    removeItemById(imageId);
    if (targetExistingId) {
      setDeletedImageIds((previous) =>
        previous.includes(targetExistingId) ? previous : [...previous, targetExistingId],
      );
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);

    if (!activity) {
      setErrorMessage("활동 정보를 먼저 불러와 주세요.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !hasMeaningfulRichTextHtml(description)) {
      setErrorMessage("활동 제목과 설명을 모두 입력해 주세요.");
      return;
    }

    const dateRangeResult = validateActivityDateRange({
      startDateInput,
      endDateInput,
    });
    if ("errorMessage" in dateRangeResult) {
      setErrorMessage(dateRangeResult.errorMessage);
      return;
    }

    setIsSaving(true);
    setUploadProgressPercent(0);

    try {
      const newOrder = readNewUploadImageItems(detailImages);
      const uploadProgress = createWeightedUploadProgressTracker({
        detailCount: newOrder.length,
        hasCover: coverFile !== null,
        onProgress: setUploadProgressPercent,
      });

      let nextCoverImageUrl = activity.coverImageUrl;
      if (coverFile) {
        nextCoverImageUrl = await uploadWithPresign({
          presignPath: PRESIGN_PATHS.activityCover,
          file: coverFile,
          onProgress: uploadProgress.reportCoverProgress,
        });
      }

      await adminResourceApi.updateActivity(activity.id, {
        title: trimmedTitle,
        description,
        startDate: dateRangeResult.startDate,
        endDate: dateRangeResult.endDate,
        coverImageUrl: nextCoverImageUrl,
        generationId,
      });

      if (deletedImageIds.length > 0) {
        await Promise.all(
          deletedImageIds.map((imageId) =>
            adminResourceApi.deleteActivityImage(activity.id, imageId),
          ),
        );
      }

      const existingOrder = detailImages.filter((image) => image.source === "existing");

      const createdMap = new Map<string, string>();
      if (newOrder.length > 0) {
        const uploadedDetailImages = await uploadDetailImages({
          presignPath: PRESIGN_PATHS.activityDetail,
          items: newOrder,
          startSortOrder: existingOrder.length,
          onProgress: uploadProgress.reportDetailProgress,
        });

        const created = await adminResourceApi.addActivityImages(
          activity.id,
          uploadedDetailImages,
        );

        created.forEach((row, index) => {
          const local = newOrder[index];
          if (local) {
            createdMap.set(local.id, row.id);
          }
        });
      }

      const finalOrder = detailImages
        .map((image) => {
          if (image.source === "existing") {
            return image.id;
          }

          return createdMap.get(image.id) ?? null;
        })
        .filter((id): id is string => Boolean(id));

      // If only newly uploaded images remain, sortOrder is already assigned in addActivityImages.
      // Reordering batch is only required when existing persisted images are still present.
      if (existingOrder.length > 0 && finalOrder.length > 0) {
        await adminResourceApi.updateActivityImages(
          activity.id,
          finalOrder.map((imageId, sortOrder) => ({
            imageId,
            sortOrder,
          })),
        );
      }

      router.push(`${generationPath}/activities/${activity.id}`);
    } catch (error) {
      setErrorMessage(readActivityErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Activities
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
        {generationName} 활동 수정
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        활동 기본 정보와 사진을 함께 수정할 수 있습니다.
      </p>

      {noticeMessage ? (
        <p className="mt-6 rounded-lg border border-warning-hairline bg-warning-soft px-4 py-3 text-sm text-warning-text">
          {noticeMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}

      <form className="mt-6 space-y-6" action={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">활동 제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-semibold text-ink">활동 설명</span>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-ink">시작일</span>
            <input
              type="date"
              value={startDateInput}
              onChange={(event) => setStartDateInput(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-ink">종료일</span>
            <input
              type="date"
              value={endDateInput}
              onChange={(event) => setEndDateInput(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-hairline p-4">
          <p className="text-sm font-semibold text-ink">대표 이미지 교체 (선택)</p>
          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
            <Image
              src={activity.coverImageUrl}
              alt={`${activity.title} 대표 이미지`}
              fill
              className="object-cover"
              unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <button
            type="button"
            data-testid="activity-edit-cover-select"
            onClick={handleOpenCoverFilePicker}
            disabled={isSaving}
            className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 선택
          </button>
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            onChange={selectCoverFile}
            disabled={isSaving}
            className="sr-only"
          />
          <p className="text-xs text-ink-muted">
            {coverFile
              ? `선택됨: ${coverFile.name}`
              : "대표 이미지를 교체하지 않으려면 비워 두세요."}
          </p>
          {coverPreviewUrl ? (
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-success-hairline bg-success-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreviewUrl}
                alt="새 대표 이미지 미리보기"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2 rounded-lg border border-hairline p-4">
          <p className="text-sm font-semibold text-ink">세부 이미지</p>
          <label className="block space-y-1">
            <span className="text-xs text-ink-muted">
              새 세부 이미지 추가 (선택, 여러 장)
            </span>
            <button
              type="button"
              data-testid="activity-edit-detail-select"
              onClick={handleOpenDetailFilePicker}
              disabled={isSaving}
              className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
            >
              파일 선택
            </button>
            <input
              ref={detailFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddDetailFiles}
              disabled={isSaving}
              className="sr-only"
            />
          </label>
          <p className="text-xs text-ink-muted">
            마우스로 끌어 세부 이미지 순서를 바꿀 수 있습니다.
          </p>
          <SortableImageGrid
            items={detailImages.map((image, index) => ({
              id: image.id,
              imageUrl: image.imageUrl,
              label:
                image.source === "existing"
                  ? `기존 이미지 ${index + 1}`
                  : (image.file?.name ?? `새 이미지 ${index + 1}`),
              subtitle: image.source === "existing" ? "기존" : "새 업로드",
            }))}
            onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
            onRemoveItem={handleRemoveDetailImage}
            disabled={isSaving}
            emptyMessage="등록된 세부 이미지가 없습니다."
          />
          <UploadProgressBar
            progressPercent={uploadProgressPercent}
            label="사진 업로드 진행률"
          />
        </div>

        <LastUpdatedMeta
          updatedAt={activity.updatedAt}
          updatedBy={activity.updatedBy}
          className="text-xs text-ink-muted"
        />

        <div className="flex flex-wrap gap-2">
          <FormSubmitButton
            data-testid="activity-edit-submit"
            disabled={isSubmitDisabled}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="수정 저장"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${generationPath}/activities/${activity.id}`}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-semibold text-ink-secondary"
          >
            상세로
          </Link>
          <Link
            href={`${generationPath}/activities`}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-semibold text-ink-secondary"
          >
            목록으로
          </Link>
        </div>
      </form>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="activity" resourceId={activity.id} />
      </div>
    </section>
  );
}
