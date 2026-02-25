"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../../../../lib/admin-api/resources";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "../../../../../../lib/admin-api/upload";
import SortableImageGrid from "../../../../_components/sortable-image-grid";
import ExhibitionRichTextEditor from "./exhibition-rich-text-editor";
import {
  hasMeaningfulExhibitionDescription,
  readExhibitionErrorMessage,
  validateExhibitionDateRange,
} from "./exhibition-shared";

type ExhibitionCreateFormProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
};

type NewDetailImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const readFileList = (files: FileList | null): File[] => (files ? Array.from(files) : []);

const createDetailImage = (file: File): NewDetailImage => ({
  id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [detailImages, setDetailImages] = useState<NewDetailImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detailImagesRef = useRef<NewDetailImage[]>([]);

  useEffect(() => {
    detailImagesRef.current = detailImages;
  }, [detailImages]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      for (const image of detailImagesRef.current) {
        URL.revokeObjectURL(image.previewUrl);
      }
    };
  }, [coverPreviewUrl]);

  const isSubmitDisabled = useMemo(() => {
    return (
      isSaving ||
      title.trim().length === 0 ||
      place.trim().length === 0 ||
      !hasMeaningfulExhibitionDescription(descriptionHtml) ||
      startDateInput.trim().length === 0 ||
      endDateInput.trim().length === 0 ||
      coverFile === null
    );
  }, [coverFile, descriptionHtml, endDateInput, isSaving, place, startDateInput, title]);

  const handleCoverFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverFile(nextFile);
    if (!nextFile) {
      setCoverPreviewUrl(null);
      return;
    }

    setCoverPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleDetailFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = readFileList(event.target.files);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    setDetailImages((previous) => [...previous, ...files.map(createDetailImage)]);
  };

  const handleRemoveDetailImage = (imageId: string) => {
    setDetailImages((previous) => {
      const target = previous.find((image) => image.id === imageId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return previous.filter((image) => image.id !== imageId);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    try {
      const coverImageUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.exhibitionCover,
        file: coverFile,
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

      if (detailImages.length > 0) {
        try {
          const uploadedDetailUrls = await Promise.all(
            detailImages.map((image) =>
              uploadWithPresign({
                presignPath: PRESIGN_PATHS.exhibitionDetail,
                file: image.file,
              }),
            ),
          );

          await adminResourceApi.addExhibitionImages(
            createdExhibition.id,
            uploadedDetailUrls.map((imageUrl, index) => ({
              imageUrl,
              sortOrder: index,
            })),
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
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Exhibitions</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">{generationName} 전시 추가</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        대표 이미지는 필수이며, 세부 이미지는 선택으로 여러 장 등록할 수 있습니다.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900">전시 제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSaving}
            placeholder="예: 연영회 60기 정기전"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900">전시 장소</span>
          <input
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            disabled={isSaving}
            placeholder="예: 서울시립미술관"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-semibold text-slate-900">전시 상세 설명 (리치 텍스트)</span>
          <ExhibitionRichTextEditor
            value={descriptionHtml}
            onChange={setDescriptionHtml}
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-900">시작일</span>
            <input
              type="date"
              value={startDateInput}
              onChange={(event) => setStartDateInput(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-900">종료일</span>
            <input
              type="date"
              value={endDateInput}
              onChange={(event) => setEndDateInput(event.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900">대표 이미지 (필수)</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverFileChange}
            disabled={isSaving}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500">
            {coverFile ? `선택됨: ${coverFile.name}` : "아직 파일이 선택되지 않았습니다."}
          </p>
          {coverPreviewUrl ? (
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverPreviewUrl} alt="대표 이미지 미리보기" className="h-full w-full object-cover" />
            </div>
          ) : null}
        </label>

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-900">세부 이미지 (선택, 다중)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleDetailFilesChange}
              disabled={isSaving}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          <p className="text-xs text-slate-500">드래그하여 세부 이미지 순서를 변경할 수 있습니다.</p>
          <SortableImageGrid
            items={detailImages.map((image, index) => ({
              id: image.id,
              imageUrl: image.previewUrl,
              label: image.file.name,
              subtitle: `순서 ${index + 1}`,
            }))}
            onReorder={(nextItems) => {
              const imageMap = new Map(detailImages.map((image) => [image.id, image]));
              setDetailImages(
                nextItems
                  .map((item) => imageMap.get(item.id))
                  .filter((item): item is NewDetailImage => item !== undefined),
              );
            }}
            onRemoveItem={handleRemoveDetailImage}
            disabled={isSaving}
            emptyMessage="추가할 세부 이미지가 없으면 비워 두세요."
          />
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "전시 생성"}
          </button>
          <Link
            href={`${generationPath}/exhibitions`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            목록으로
          </Link>
        </div>
      </form>
    </section>
  );
}
