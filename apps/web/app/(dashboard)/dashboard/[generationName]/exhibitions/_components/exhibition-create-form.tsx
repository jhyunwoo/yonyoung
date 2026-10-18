"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import {
  type UploadedCover,
  uploadCoverOnce,
} from "@/features/media/upload/upload-cover-once";
import {
  readNewUploadImageItems,
  uploadDetailImages,
} from "@/features/media/upload/detail-image-upload";
import { createWeightedUploadProgressTracker } from "@/features/media/upload/weighted-upload-progress";
import { useSelectedImageFile } from "@/features/media/upload/use-selected-image-file";
import { useDetailImageField } from "@/features/media/upload/use-detail-image-field";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import { useGuardedSubmit } from "@/shared/react/use-guarded-submit";
import DateRangeFields from "@/app/(dashboard)/_components/date-range-fields";
import CoverImageField from "@/app/(dashboard)/_components/media/cover-image-field";
import DetailImagesField from "@/app/(dashboard)/_components/media/detail-images-field";
import ExhibitionRichTextEditor from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-rich-text-editor";
import { readExhibitionErrorMessage } from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { validateDateRange } from "@/shared/utils/date-input";

type ExhibitionCreateFormProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
};

const EMPTY_DESCRIPTION_HTML = "<p></p>";

export default function ExhibitionCreateForm({
  generationId,
  generationPath,
  generationName,
}: ExhibitionCreateFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState(EMPTY_DESCRIPTION_HTML);
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
    place.trim().length === 0 ||
    !hasMeaningfulRichTextHtml(descriptionHtml) ||
    startDateInput.trim().length === 0 ||
    endDateInput.trim().length === 0 ||
    coverFile === null;

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedPlace = place.trim();

    if (!trimmedTitle || !trimmedPlace) {
      setErrorMessage("전시 제목과 장소를 모두 입력해 주세요.");
      return;
    }

    if (!hasMeaningfulRichTextHtml(descriptionHtml)) {
      setErrorMessage("전시 상세 설명을 입력해 주세요.");
      return;
    }

    if (!coverFile) {
      setErrorMessage("대표 이미지 파일을 선택해 주세요.");
      return;
    }

    const dateRangeResult = validateDateRange({ startDateInput, endDateInput }, "전시");

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
        presignPath: PRESIGN_PATHS.exhibitionCover,
        onProgress: uploadProgress.reportCoverProgress,
      });

      const createdExhibition = await adminResourceApi.createExhibition({
        title: trimmedTitle,
        place: trimmedPlace,
        description: descriptionHtml,
        startDate: dateRangeResult.startDate,
        endDate: dateRangeResult.endDate,
        coverImageUrl,
        generationId,
      });

      if (newDetailImages.length > 0) {
        try {
          const uploadedDetailImages = await uploadDetailImages({
            presignPath: PRESIGN_PATHS.exhibitionDetail,
            items: newDetailImages,
            onProgress: uploadProgress.reportDetailProgress,
          });

          await adminResourceApi.addExhibitionImages(
            createdExhibition.id,
            uploadedDetailImages,
          );
        } catch (detailUploadError) {
          const detailUploadMessage = readExhibitionErrorMessage(detailUploadError);
          const params = new URLSearchParams({
            error: "detail-upload-failed",
            message: detailUploadMessage,
          });
          router.push(
            `${generationPath}/exhibitions/${createdExhibition.id}/edit?${params.toString()}`,
          );
          return;
        }
      }

      router.push(`${generationPath}/exhibitions/${createdExhibition.id}`);
    } catch (error) {
      setErrorMessage(readExhibitionErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };
  const submitForm = useGuardedSubmit(handleSubmit);

  return (
    <section className="mx-auto w-full max-w-5xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Exhibitions
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">
        {generationName} 전시 추가
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        대표 사진은 꼭 등록해야 하며, 세부 사진은 필요할 때 여러 장 추가할 수 있습니다.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submitForm}>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">전시 제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            placeholder="예: 연영회 60기 정기전"
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">전시 장소</span>
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            disabled={isSaving}
            placeholder="예: 서울시립미술관"
            className="w-full rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-semibold text-ink">전시 상세 설명</span>
          <ExhibitionRichTextEditor
            value={descriptionHtml}
            onChange={setDescriptionHtml}
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
          testIdPrefix="exhibition-create"
          cover={cover}
          disabled={isSaving}
        />

        <DetailImagesField
          testIdPrefix="exhibition-create"
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
            data-testid="exhibition-create-submit"
            disabled={isSubmitDisabled}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
            idleLabel="전시 생성"
            pendingLabel="저장 중..."
          />
          <Link
            href={`${generationPath}/exhibitions`}
            className="rounded-lg border border-hairline-strong px-4 py-2 text-sm font-semibold text-ink-secondary"
          >
            목록으로
          </Link>
        </div>
      </form>
    </section>
  );
}
