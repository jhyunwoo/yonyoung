"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import { useGuardedSubmit } from "@/shared/react/use-guarded-submit";
import {
  readNewUploadImageItems,
  uploadDetailImages,
} from "@/features/media/upload/detail-image-upload";
import { createWeightedUploadProgressTracker } from "@/features/media/upload/weighted-upload-progress";
import { useSelectedImageFile } from "@/features/media/upload/use-selected-image-file";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import {
  type UploadedCover,
  uploadCoverOnce,
} from "@/features/media/upload/upload-cover-once";
import { useDetailImageField } from "@/features/media/upload/use-detail-image-field";
import {
  EMPTY_RICH_TEXT_HTML,
  hasMeaningfulRichTextHtml,
} from "@/features/media/rich-text/rich-text";
import RichTextEditor from "@/app/(dashboard)/_components/lazy-rich-text-editor";
import DateRangeFields from "@/app/(dashboard)/_components/date-range-fields";
import CoverImageField from "@/app/(dashboard)/_components/media/cover-image-field";
import DetailImagesField from "@/app/(dashboard)/_components/media/detail-images-field";
import { readActivityErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/activities/_components/activity-shared";
import { validateDateRange } from "@/shared/utils/date-input";

type ActivityCreateFormProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
};

export default function ActivityCreateForm({
  generationId,
  generationPath,
  generationName,
}: ActivityCreateFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(EMPTY_RICH_TEXT_HTML);
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const cover = useSelectedImageFile();
  const coverFile = cover.selectedFile;
  const uploadedCoverRef = useRef<UploadedCover | null>(null);
  const detailImages = useDetailImageField();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled =
    isSaving ||
    title.trim().length === 0 ||
    !hasMeaningfulRichTextHtml(description) ||
    startDateInput.trim().length === 0 ||
    endDateInput.trim().length === 0 ||
    coverFile === null;

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle || !hasMeaningfulRichTextHtml(description)) {
      setErrorMessage("활동 제목과 설명을 모두 입력해 주세요.");
      return;
    }

    if (!coverFile) {
      setErrorMessage("대표 이미지 파일을 선택해 주세요.");
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
      const newDetailImages = readNewUploadImageItems(detailImages.items);
      const uploadProgress = createWeightedUploadProgressTracker({
        detailCount: newDetailImages.length,
        onProgress: setUploadProgressPercent,
      });

      // 등록 요청이 실패해 다시 저장할 때 같은 대표 사진을 R2에 또 올리지 않는다.
      const coverImageUrl = await uploadCoverOnce({
        cacheRef: uploadedCoverRef,
        file: coverFile,
        presignPath: PRESIGN_PATHS.activityCover,
        onProgress: uploadProgress.reportCoverProgress,
      });

      const createdActivity = await adminResourceApi.createActivity({
        title: trimmedTitle,
        description,
        startDate: dateRangeResult.startDate,
        endDate: dateRangeResult.endDate,
        coverImageUrl,
        generationId,
      });

      if (newDetailImages.length > 0) {
        try {
          const uploadedDetailImages = await uploadDetailImages({
            presignPath: PRESIGN_PATHS.activityDetail,
            items: newDetailImages,
            onProgress: uploadProgress.reportDetailProgress,
          });

          await adminResourceApi.addActivityImages(
            createdActivity.id,
            uploadedDetailImages,
          );
        } catch (detailUploadError) {
          const detailUploadMessage = readActivityErrorMessage(detailUploadError);
          const params = new URLSearchParams({
            error: "detail-upload-failed",
            message: detailUploadMessage,
          });
          router.push(
            `${generationPath}/activities/${createdActivity.id}/edit?${params.toString()}`,
          );
          return;
        }
      }

      router.push(`${generationPath}/activities/${createdActivity.id}`);
    } catch (error) {
      setErrorMessage(readActivityErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };
  const submitForm = useGuardedSubmit(handleSubmit);

  return (
    <section className="mx-auto w-full max-w-4xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Activities
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
        {generationName} 활동 추가
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        대표 사진은 꼭 등록해야 하며, 세부 사진은 필요할 때 여러 장 추가할 수 있습니다.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submitForm}>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">활동 제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            placeholder="예: 60기 정기 촬영 워크숍"
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
          testIdPrefix="activity-create"
          cover={cover}
          disabled={isSaving}
        />

        <DetailImagesField
          testIdPrefix="activity-create"
          variant="create"
          field={detailImages}
          disabled={isSaving}
          uploadProgressPercent={uploadProgressPercent}
        />

        {errorMessage ? (
          <p className="rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <FormSubmitButton
            pending={isSaving}
            data-testid="activity-create-submit"
            disabled={isSubmitDisabled}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="활동 생성"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${generationPath}/activities`}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-semibold text-ink-secondary"
          >
            목록으로
          </Link>
        </div>
      </form>
    </section>
  );
}
