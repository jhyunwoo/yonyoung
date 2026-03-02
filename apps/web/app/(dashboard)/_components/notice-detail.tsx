"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import { AdminApiError } from "@/shared/http/http";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { createExistingUploadImageItem } from "@/features/media/upload/image-upload-state";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { RichTextContent } from "@/features/media/rich-text/rich-text-content";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NOTICE_MAX_IMAGES,
  buildRoleLabel,
  normalizeNoticeImageUrls,
  readNoticeErrorMessage,
  toNoticeItem,
  type NoticeItem,
  type NoticeScope,
} from "@/app/(dashboard)/_components/notice-shared";

type NoticeDetailProps = {
  scope: NoticeScope;
  generationId?: string;
  noticeId: string;
  canWrite: boolean;
  listPath: string;
  heading: string;
  description: string;
  editPath?: string;
  allowInlineEdit?: boolean;
};

export default function NoticeDetail({
  scope,
  generationId,
  noticeId,
  canWrite,
  listPath,
  heading,
  description,
  editPath,
  allowInlineEdit = true,
}: NoticeDetailProps) {
  const router = useRouter();
  const editingImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const canInlineEdit = canWrite && allowInlineEdit;

  const [notice, setNotice] = useState<NoticeItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const {
    items: editingImageItems,
    replaceItems: replaceEditingImageItems,
    appendExistingUrls: appendEditingImageUrls,
    removeItemById: removeEditingImageById,
    reorderByIds: reorderEditingImageByIds,
  } = useImageUploadState({ maxItems: NOTICE_MAX_IMAGES });
  const editingImageUrls = useMemo(
    () => editingImageItems.map((item) => item.imageUrl),
    [editingImageItems],
  );
  const isEditingImageUploadDisabled =
    isSaving ||
    isUploadingImage ||
    editingImageUrls.length >= NOTICE_MAX_IMAGES;

  const loadNotice = useCallback(async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      let noticeEntity;
      if (scope === "generation") {
        if (!generationId) {
          throw new Error("기수 정보가 없습니다.");
        }

        noticeEntity = await adminResourceApi.getGenerationNoticeById(generationId, noticeId);
      } else {
        noticeEntity = await adminResourceApi.getGlobalNoticeById(noticeId);
      }

      const mapped = toNoticeItem(noticeEntity);
      setNotice(mapped);
      if (!isEditing) {
        setEditingTitle(mapped.title);
        setEditingContent(mapped.content);
        replaceEditingImageItems(
          mapped.imageUrls.map((imageUrl, index) =>
            createExistingUploadImageItem({
              id: `existing-${index}-${imageUrl}`,
              imageUrl,
            }),
          ),
        );
      }
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 404) {
        setIsNotFound(true);
        setNotice(null);
      } else {
        setErrorMessage(readNoticeErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [generationId, isEditing, noticeId, replaceEditingImageItems, scope]);

  useEffect(() => {
    void loadNotice();
  }, [loadNotice]);

  const startEditing = () => {
    if (!notice || !canInlineEdit) {
      return;
    }

    setEditingTitle(notice.title);
    setEditingContent(notice.content);
    replaceEditingImageItems(
      notice.imageUrls.map((imageUrl, index) =>
        createExistingUploadImageItem({
          id: `existing-${index}-${imageUrl}`,
          imageUrl,
        }),
      ),
    );
    setIsEditing(true);
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    if (!notice) {
      return;
    }

    setIsEditing(false);
    setEditingTitle(notice.title);
    setEditingContent(notice.content);
    replaceEditingImageItems(
      notice.imageUrls.map((imageUrl, index) =>
        createExistingUploadImageItem({
          id: `existing-${index}-${imageUrl}`,
          imageUrl,
        }),
      ),
    );
  };

  const handleUploadEditingImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots = NOTICE_MAX_IMAGES - editingImageUrls.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`이미지는 최대 ${NOTICE_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);

    setIsUploadingImage(true);
    setUploadProgressPercent(0);
    setErrorMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.noticeImage,
        files: uploadTargets,
        onProgress: setUploadProgressPercent,
      });
      appendEditingImageUrls(uploadedUrls);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsUploadingImage(false);
      setUploadProgressPercent(null);
    }
  };

  const handleUploadEditingImageClick = () => {
    if (isEditingImageUploadDisabled) {
      return;
    }

    editingImageFileInputRef.current?.click();
  };

  const handleUpdateNotice = async () => {
    const nextTitle = editingTitle.trim();

    if (!nextTitle || !hasMeaningfulRichTextHtml(editingContent)) {
      setErrorMessage("제목과 본문을 모두 입력해 주세요.");
      return;
    }

    const normalizedImageUrls = normalizeNoticeImageUrls(editingImageUrls);

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let updatedNotice;
      if (scope === "generation") {
        if (!generationId) {
          throw new Error("기수 정보가 없습니다.");
        }

        updatedNotice = await adminResourceApi.updateGenerationNotice(generationId, noticeId, {
          title: nextTitle,
          content: editingContent,
          imageUrls: normalizedImageUrls,
        });
      } else {
        updatedNotice = await adminResourceApi.updateGlobalNotice(noticeId, {
          title: nextTitle,
          content: editingContent,
          imageUrls: normalizedImageUrls,
        });
      }

      const mapped = toNoticeItem(updatedNotice);
      setNotice(mapped);
      setEditingTitle(mapped.title);
      setEditingContent(mapped.content);
      replaceEditingImageItems(
        mapped.imageUrls.map((imageUrl, index) =>
          createExistingUploadImageItem({
            id: `existing-${index}-${imageUrl}`,
            imageUrl,
          }),
        ),
      );
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotice = async () => {
    const shouldDelete = window.confirm("공지를 삭제하시겠습니까?");
    if (!shouldDelete) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (scope === "generation") {
        if (!generationId) {
          throw new Error("기수 정보가 없습니다.");
        }

        await adminResourceApi.deleteGenerationNotice(generationId, noticeId);
      } else {
        await adminResourceApi.deleteGlobalNotice(noticeId);
      }

      router.replace(listPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readNoticeErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const renderedImageUrls = useMemo(() => {
    if (isEditing) {
      return editingImageUrls;
    }

    return notice?.imageUrls ?? [];
  }, [editingImageUrls, isEditing, notice?.imageUrls]);

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="h-36 w-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`notice-detail-loading-image-${index + 1}`} className="aspect-[4/3] w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{heading}</h1>
        <p className="mt-3 text-sm text-slate-600">존재하지 않는 공지이거나 접근할 수 없습니다.</p>
        <Link
          href={listPath}
          className="mt-6 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          목록으로 이동
        </Link>
      </section>
    );
  }

  if (!notice) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-500">공지 데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Notices</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">{heading}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">{description}</p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        {isEditing ? (
          <div className="space-y-3">
            <input
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              disabled={isSaving || isUploadingImage}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <RichTextEditor
              value={editingContent}
              onChange={setEditingContent}
              disabled={isSaving || isUploadingImage}
            />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-slate-900">{notice.title}</h2>
            <p className="mt-2 text-xs text-slate-500">
              작성자: {notice.author.name} ({buildRoleLabel(notice.author.role)}) · 작성일: {formatKoreanDate(notice.createdAt)}
            </p>
            <LastUpdatedMeta
              updatedAt={notice.updatedAt}
              updatedBy={notice.updatedBy}
              className="mt-2 text-xs text-slate-500"
            />
            <div className="mt-3">
              <RichTextContent html={notice.content} />
            </div>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">첨부 이미지</p>
          <p className="mt-1 text-xs text-slate-500">최대 {NOTICE_MAX_IMAGES}장</p>

          <button
            type="button"
            onClick={handleUploadEditingImageClick}
            disabled={isEditingImageUploadDisabled}
            className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 업로드
          </button>
          <input
            ref={editingImageFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadEditingImage}
            disabled={isEditingImageUploadDisabled}
            className="sr-only"
          />

          {isUploadingImage ? (
            <p className="mt-2 text-xs text-slate-500">이미지 업로드 중...</p>
          ) : null}
          {!isUploadingImage && editingImageUrls.length >= NOTICE_MAX_IMAGES ? (
            <p className="mt-2 text-xs text-slate-500">
              최대 {NOTICE_MAX_IMAGES}장까지 등록되어 추가 업로드가 비활성화되었습니다.
            </p>
          ) : null}
          <UploadProgressBar progressPercent={uploadProgressPercent} label="첨부 이미지 업로드 진행률" />

          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">마우스로 끌어 이미지 순서를 바꿀 수 있습니다.</p>
            <SortableImageGrid
              items={editingImageItems.map((image, index) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                label: `첨부 이미지 ${index + 1}`,
                alt: "공지 첨부 이미지",
              }))}
              onReorder={(nextItems) => reorderEditingImageByIds(nextItems.map((item) => item.id))}
              onRemoveItem={removeEditingImageById}
              disabled={isSaving || isUploadingImage}
              emptyMessage="첨부된 이미지가 없습니다."
            />
          </div>
        </div>
      ) : renderedImageUrls.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-900">첨부 이미지</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {renderedImageUrls.map((imageUrl, index) => (
              <div
                key={`${notice.id}-${imageUrl}-${index}`}
                className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <Image
                  src={imageUrl}
                  alt={`공지 첨부 이미지 ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={shouldUseUnoptimizedImage(imageUrl)}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={listPath}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          목록으로
        </Link>

        {canInlineEdit ? (
          isEditing ? (
            <>
              <button
                type="button"
                onClick={() => void handleUpdateNotice()}
                disabled={isSaving || isUploadingImage}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving || isUploadingImage}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                바로 수정
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteNotice()}
                disabled={isSaving}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                삭제
              </button>
            </>
          )
        ) : editPath ? (
          <Link
            href={editPath}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            수정 페이지로 이동
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <AuditHistoryPanel
          resourceType={scope === "generation" ? "generation_notice" : "global_notice"}
          resourceId={noticeId}
        />
      </div>
    </section>
  );
}
