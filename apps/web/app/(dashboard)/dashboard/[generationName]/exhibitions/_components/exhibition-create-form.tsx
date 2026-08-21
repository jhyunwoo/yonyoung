"use client";

import { ChangeEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import { readFileList } from "@/features/media/upload/image-upload-state";
import {
  readNewUploadImageItems,
  uploadDetailImages,
} from "@/features/media/upload/detail-image-upload";
import { createWeightedUploadProgressTracker } from "@/features/media/upload/weighted-upload-progress";
import { useSelectedImageFile } from "@/features/media/upload/use-selected-image-file";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import FormSubmitButton from "@/app/(dashboard)/_components/form-submit-button";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import ExhibitionRichTextEditor from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-rich-text-editor";
import {
  hasMeaningfulExhibitionDescription,
  readExhibitionErrorMessage,
  validateExhibitionDateRange,
} from "@/app/(dashboard)/dashboard/[generationName]/exhibitions/_components/exhibition-shared";

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
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    items: detailImages,
    appendFiles,
    removeItemById,
    reorderByIds,
  } = useImageUploadState();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled =
    isSaving ||
    title.trim().length === 0 ||
    place.trim().length === 0 ||
    !hasMeaningfulExhibitionDescription(descriptionHtml) ||
    startDateInput.trim().length === 0 ||
    endDateInput.trim().length === 0 ||
    cover.selectedFile === null;

  const handleDetailFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
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

    cover.openFilePicker();
  };

  const handleOpenDetailFilePicker = () => {
    if (isSaving) {
      return;
    }

    detailFileInputRef.current?.click();
  };

  const handleRemoveDetailImage = (imageId: string) => {
    removeItemById(imageId);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedPlace = place.trim();

    if (!trimmedTitle || !trimmedPlace) {
      setErrorMessage("전시 제목과 장소를 모두 입력해 주세요.");
      return;
    }

    if (!hasMeaningfulExhibitionDescription(descriptionHtml)) {
      setErrorMessage("전시 상세 설명을 입력해 주세요.");
      return;
    }

    const coverFile = cover.selectedFile;
    if (!coverFile) {
      setErrorMessage("대표 이미지 파일을 선택해 주세요.");
      return;
    }

    const dateRangeResult = validateExhibitionDateRange({
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
      const newDetailImages = readNewUploadImageItems(detailImages);
      const uploadProgress = createWeightedUploadProgressTracker({
        detailCount: newDetailImages.length,
        onProgress: setUploadProgressPercent,
      });

      const coverImageUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.exhibitionCover,
        file: coverFile,
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

      <form className="mt-6 space-y-4" action={handleSubmit}>
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

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-ink">대표 이미지 (필수)</span>
          <button
            type="button"
            data-testid="exhibition-create-cover-select"
            onClick={handleOpenCoverFilePicker}
            disabled={isSaving}
            className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 선택
          </button>
          <input
            ref={cover.fileInputRef}
            type="file"
            accept="image/*"
            onChange={cover.selectFile}
            disabled={isSaving}
            className="sr-only"
          />
          <p className="text-xs text-ink-muted">
            {cover.selectedFile
              ? `선택됨: ${cover.selectedFile.name}`
              : "아직 파일이 선택되지 않았습니다."}
          </p>
          {cover.previewUrl ? (
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.previewUrl}
                alt="대표 이미지 미리보기"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </label>

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-ink">
              세부 이미지 (선택, 여러 장)
            </span>
            <button
              type="button"
              data-testid="exhibition-create-detail-select"
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
              onChange={handleDetailFilesChange}
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
              label: image.file?.name ?? `세부 이미지 ${index + 1}`,
              subtitle: `순서 ${index + 1}`,
            }))}
            onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
            onRemoveItem={handleRemoveDetailImage}
            disabled={isSaving}
            emptyMessage="추가할 세부 이미지가 없으면 비워 두세요."
          />
          <UploadProgressBar
            progressPercent={uploadProgressPercent}
            label="사진 업로드 진행률"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <FormSubmitButton
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
