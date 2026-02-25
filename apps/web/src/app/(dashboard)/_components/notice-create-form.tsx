"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "../../../lib/admin-api/resources";
import { PRESIGN_PATHS, uploadWithPresign } from "../../../lib/admin-api/upload";
import { hasMeaningfulRichTextHtml } from "../../../lib/rich-text";
import { useImageUploadState } from "../../../lib/use-image-upload-state";
import RichTextEditor, { EMPTY_RICH_TEXT_HTML } from "./rich-text-editor";
import SortableImageGrid from "./sortable-image-grid";
import {
  NOTICE_MAX_IMAGES,
  normalizeNoticeImageUrls,
  readNoticeErrorMessage,
  type NoticeScope,
} from "./notice-shared";

type NoticeCreateFormProps = {
  scope: NoticeScope;
  generationId?: string;
  canWrite: boolean;
  basePath: string;
  listPath: string;
  heading: string;
  description: string;
};

export default function NoticeCreateForm({
  scope,
  generationId,
  canWrite,
  basePath,
  listPath,
  heading,
  description,
}: NoticeCreateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(EMPTY_RICH_TEXT_HTML);
  const {
    items: imageItems,
    appendExistingUrls,
    removeItemById,
    reorderByIds,
  } = useImageUploadState({ maxItems: NOTICE_MAX_IMAGES });
  const imageUrls = useMemo(
    () => imageItems.map((item) => item.imageUrl),
    [imageItems],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (canWrite) {
      return;
    }

    router.replace(listPath);
  }, [canWrite, listPath, router]);

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (imageUrls.length >= NOTICE_MAX_IMAGES) {
      setErrorMessage(`이미지는 최대 ${NOTICE_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage(null);

    try {
      const uploadedUrl = await uploadWithPresign({
        presignPath: PRESIGN_PATHS.noticeImage,
        file,
      });
      appendExistingUrls([uploadedUrl]);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImageUrl = (targetId: string) => {
    removeItemById(targetId);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextTitle = title.trim();
    if (!nextTitle || !hasMeaningfulRichTextHtml(content)) {
      setErrorMessage("제목과 본문을 모두 입력해 주세요.");
      return;
    }

    const normalizedImageUrls = normalizeNoticeImageUrls(imageUrls);

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let createdNotice;
      if (scope === "generation") {
        if (!generationId) {
          throw new Error("기수 정보가 없습니다.");
        }

        createdNotice = await adminResourceApi.createGenerationNotice(generationId, {
          title: nextTitle,
          content,
          imageUrls: normalizedImageUrls,
        });
      } else {
        createdNotice = await adminResourceApi.createGlobalNotice({
          title: nextTitle,
          content,
          imageUrls: normalizedImageUrls,
        });
      }

      router.replace(`${basePath}/${createdNotice.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (!canWrite) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-500">권한을 확인하는 중입니다...</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Notices</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">{heading}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">{description}</p>

      <form
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-semibold text-slate-900">새 공지 작성</p>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSaving || isUploadingImage}
          placeholder="공지 제목"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <div className="space-y-1">
          <span className="text-sm font-semibold text-slate-900">공지 본문 (리치 텍스트)</span>
          <RichTextEditor
            value={content}
            onChange={setContent}
            disabled={isSaving || isUploadingImage}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">첨부 이미지</p>
          <p className="mt-1 text-xs text-slate-500">최대 {NOTICE_MAX_IMAGES}장</p>

          <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            파일 업로드
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              disabled={isSaving || isUploadingImage || imageUrls.length >= NOTICE_MAX_IMAGES}
              className="hidden"
            />
          </label>

          {isUploadingImage ? (
            <p className="mt-2 text-xs text-slate-500">이미지 업로드 중...</p>
          ) : null}

          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">드래그하여 이미지 순서를 변경할 수 있습니다.</p>
            <SortableImageGrid
              items={imageItems.map((image, index) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                label: `첨부 이미지 ${index + 1}`,
                alt: "공지 첨부 이미지",
              }))}
              onReorder={(nextItems) => reorderByIds(nextItems.map((item) => item.id))}
              onRemoveItem={removeImageUrl}
              disabled={isSaving || isUploadingImage}
              emptyMessage="첨부된 이미지가 없습니다."
            />
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isSaving || isUploadingImage}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "공지 등록"}
          </button>
          <Link
            href={listPath}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            목록으로
          </Link>
        </div>
      </form>
    </section>
  );
}
