"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiActivity } from "@yonyoung/contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import {
  type UploadedCover,
  uploadCoverOnce,
} from "@/features/media/upload/upload-cover-once";
import {
  readNewUploadImageItems,
  type UploadedDetailImage,
} from "@/features/media/upload/detail-image-upload";
import { syncDetailImages } from "@/features/media/upload/detail-image-sync";
import { createWeightedUploadProgressTracker } from "@/features/media/upload/weighted-upload-progress";
import { useSelectedImageFile } from "@/features/media/upload/use-selected-image-file";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import {
  toSortedDetailImageItems,
  useDetailImageField,
} from "@/features/media/upload/use-detail-image-field";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import { useGuardedSubmit } from "@/shared/react/use-guarded-submit";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import DateRangeFields from "@/app/(dashboard)/_components/date-range-fields";
import CoverImageField from "@/app/(dashboard)/_components/media/cover-image-field";
import DetailImagesField from "@/app/(dashboard)/_components/media/detail-images-field";
import { readActivityErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";
import { formatTimestampToDateInput, validateDateRange } from "@/shared/utils/date-input";

type ActivityEditFormProps = {
  activity: ApiActivity;
  generationId: string;
  generationName: string;
  generationPath: string;
  initialMessage: string | null;
};

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
  const cover = useSelectedImageFile();
  const coverFile = cover.selectedFile;
  const detailImages = useDetailImageField(() =>
    toSortedDetailImageItems(activity.detailImages),
  );
  // 저장이 중간에 실패했을 때 재시도가 이미 끝난 업로드를 반복하지 않도록 결과를 기억한다.
  const uploadedCoverRef = useRef<UploadedCover | null>(null);
  const detailUploadCacheRef = useRef(new Map<string, UploadedDetailImage>());
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);

  const isSubmitDisabled =
    isSaving ||
    title.trim().length === 0 ||
    !hasMeaningfulRichTextHtml(description) ||
    startDateInput.trim().length === 0 ||
    endDateInput.trim().length === 0;

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

    const dateRangeResult = validateDateRange({ startDateInput, endDateInput }, "활동");
    if ("errorMessage" in dateRangeResult) {
      setErrorMessage(dateRangeResult.errorMessage);
      return;
    }

    setIsSaving(true);
    setUploadProgressPercent(0);

    try {
      const newOrder = readNewUploadImageItems(detailImages.items);
      const uploadProgress = createWeightedUploadProgressTracker({
        detailCount: newOrder.length,
        hasCover: coverFile !== null,
        onProgress: setUploadProgressPercent,
      });

      let nextCoverImageUrl = activity.coverImageUrl;
      if (coverFile) {
        // 이전 시도에서 이미 올린 대표 사진이면 다시 올리지 않는다.
        nextCoverImageUrl = await uploadCoverOnce({
          cacheRef: uploadedCoverRef,
          file: coverFile,
          presignPath: PRESIGN_PATHS.activityCover,
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

      await syncDetailImages({
        presignPath: PRESIGN_PATHS.activityDetail,
        items: detailImages.items,
        deletedImageIds: detailImages.deletedImageIds,
        uploadCache: detailUploadCacheRef.current,
        onProgress: uploadProgress.reportDetailProgress,
        api: {
          deleteImage: (imageId) =>
            adminResourceApi.deleteActivityImage(activity.id, imageId),
          addImages: (images) => adminResourceApi.addActivityImages(activity.id, images),
          reorderImages: (items) =>
            adminResourceApi.updateActivityImages(activity.id, items),
        },
        onImagesDeleted: detailImages.forgetDeletedImageIds,
        onImagesPersisted: detailImages.markItemsPersisted,
      });

      router.push(`${generationPath}/activities/${activity.id}`);
    } catch (error) {
      setErrorMessage(readActivityErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };
  const submitForm = useGuardedSubmit(handleSubmit);

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

      <form className="mt-6 space-y-6" onSubmit={submitForm}>
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

        <DateRangeFields
          startDate={startDateInput}
          endDate={endDateInput}
          onStartDateChange={setStartDateInput}
          onEndDateChange={setEndDateInput}
          disabled={isSaving}
        />

        <CoverImageField
          testIdPrefix="activity-edit"
          cover={cover}
          disabled={isSaving}
          currentImage={{
            url: activity.coverImageUrl,
            alt: `${activity.title} 대표 이미지`,
          }}
        />

        <DetailImagesField
          testIdPrefix="activity-edit"
          variant="edit"
          field={detailImages}
          disabled={isSaving}
          uploadProgressPercent={uploadProgressPercent}
        />

        <LastUpdatedMeta
          updatedAt={activity.updatedAt}
          updatedBy={activity.updatedBy}
          className="text-xs text-ink-muted"
        />

        <div className="flex flex-wrap gap-2">
          <FormSubmitButton
            pending={isSaving}
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
