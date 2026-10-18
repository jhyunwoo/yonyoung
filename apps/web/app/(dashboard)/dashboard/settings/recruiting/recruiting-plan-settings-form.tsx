"use client";

import { IMAGE_UPLOAD_ACCEPT } from "@yonyoung/contracts";
import type { ApiRecruitingPlan } from "@yonyoung/contracts";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { PRESIGN_PATHS } from "@/features/dashboard/api/admin-api/upload";
import { uploadFilesWithPresign } from "@/features/dashboard/api/admin-api/upload-batch";
import { readErrorMessage } from "@/shared/http/read-error-message";
import { createExistingUploadImageItem } from "@/features/media/upload/image-upload-state";
import { hasMeaningfulRichTextHtml } from "@/features/media/rich-text/rich-text";
import { useImageUploadState } from "@/features/media/upload/use-image-upload-state";
import RichTextEditor from "@/app/(dashboard)/_components/rich-text-editor";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import { useIsMounted } from "@/shared/react/use-is-mounted";

const RECRUITING_MAX_IMAGES = 10;

const inputClassName =
  "w-full rounded-lg border border-hairline-strong px-3 py-2 text-sm text-ink outline-none transition focus-visible:border-primary focus-visible:shadow-(--shadow-focus)";

const ERROR_FALLBACK_MESSAGE =
  "모집 계획 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

const formatTimestampToDateTimeLocal = (timestampMs: number): string => {
  const date = new Date(timestampMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const parseDateTimeLocalToTimestamp = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toUploadImageItems = (urls: string[]) =>
  urls.map((imageUrl, index) =>
    createExistingUploadImageItem({
      id: `existing-${index}-${imageUrl}`,
      imageUrl,
    }),
  );

type RecruitingPlanSettingsFormProps = {
  /** 서버 컴포넌트가 읽어 내려 준 현재 모집 계획. 아직 없으면 null이다. 읽기에 실패하면 폼 자체를 렌더링하지 않는다. */
  initialPlan: ApiRecruitingPlan | null;
};

export default function RecruitingPlanSettingsForm({
  initialPlan,
}: RecruitingPlanSettingsFormProps) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const promotionFileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialPlan?.title ?? "");
  const [content, setContent] = useState(initialPlan?.content ?? "");
  // 브라우저 시간대로 바꾼 값이라 서버 렌더 값과 다를 수 있다. 입력에는 마운트 뒤에만 보여 준다.
  const [recruitmentStartAtInput, setRecruitmentStartAtInput] = useState(() =>
    initialPlan ? formatTimestampToDateTimeLocal(initialPlan.recruitmentStartAt) : "",
  );
  const [recruitmentEndAtInput, setRecruitmentEndAtInput] = useState(() =>
    initialPlan ? formatTimestampToDateTimeLocal(initialPlan.recruitmentEndAt) : "",
  );
  const {
    items: promotionImageItems,
    replaceItems: replacePromotionImageItems,
    appendExistingUrls: appendPromotionImageUrls,
    removeItemById: removePromotionImageById,
    reorderByIds: reorderPromotionImageByIds,
  } = useImageUploadState({
    initialItems: toUploadImageItems(initialPlan?.promotionImageUrls ?? []),
    maxItems: RECRUITING_MAX_IMAGES,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const promotionImageUrls = useMemo(
    () => promotionImageItems.map((item) => item.imageUrl),
    [promotionImageItems],
  );
  // 서버 렌더 직후 hydration 전에는 입력을 막는다(기본 설정 폼과 같다).
  const isFormDisabled = !isMounted || isSaving || isUploadingImage;
  const isPromotionUploadDisabled =
    isFormDisabled || promotionImageUrls.length >= RECRUITING_MAX_IMAGES;

  const handleUploadPromotionImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingSlots = RECRUITING_MAX_IMAGES - promotionImageUrls.length;
    if (remainingSlots <= 0) {
      setErrorMessage(`이미지는 최대 ${RECRUITING_MAX_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }

    const uploadTargets = files.slice(0, remainingSlots);
    setIsUploadingImage(true);
    setUploadProgressPercent(0);
    setErrorMessage(null);

    try {
      const uploadedUrls = await uploadFilesWithPresign({
        presignPath: PRESIGN_PATHS.recruitingImage,
        files: uploadTargets,
        onProgress: setUploadProgressPercent,
      });
      appendPromotionImageUrls(uploadedUrls);
    } catch (error) {
      setErrorMessage(readErrorMessage(error, ERROR_FALLBACK_MESSAGE));
    } finally {
      setIsUploadingImage(false);
      setUploadProgressPercent(null);
    }
  };

  const handlePromotionImageUploadClick = () => {
    if (isPromotionUploadDisabled) {
      return;
    }

    promotionFileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      setErrorMessage("제목을 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (!hasMeaningfulRichTextHtml(content)) {
      setErrorMessage("세부 내용을 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    const recruitmentStartAt = parseDateTimeLocalToTimestamp(recruitmentStartAtInput);
    const recruitmentEndAt = parseDateTimeLocalToTimestamp(recruitmentEndAtInput);
    if (recruitmentStartAt === null || recruitmentEndAt === null) {
      setErrorMessage("모집 시작일시와 종료일시를 올바르게 입력해 주세요.");
      setSuccessMessage(null);
      return;
    }

    if (recruitmentStartAt > recruitmentEndAt) {
      setErrorMessage("모집 시작일시는 모집 종료일시보다 늦을 수 없습니다.");
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await adminResourceApi.upsertCurrentRecruitingPlan({
        title: trimmedTitle,
        content,
        promotionImageUrls,
        recruitmentStartAt,
        recruitmentEndAt,
      });

      setTitle(updated.title);
      setContent(updated.content);
      setRecruitmentStartAtInput(
        formatTimestampToDateTimeLocal(updated.recruitmentStartAt),
      );
      setRecruitmentEndAtInput(formatTimestampToDateTimeLocal(updated.recruitmentEndAt));
      replacePromotionImageItems(toUploadImageItems(updated.promotionImageUrls));
      setSuccessMessage("올해 모집 계획을 저장했습니다.");
      router.refresh();
    } catch (error) {
      setErrorMessage(readErrorMessage(error, ERROR_FALLBACK_MESSAGE));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
        Settings / Recruiting
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">모집 계획</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted md:text-base">
        올해 모집 계획의 제목, 세부 내용, 홍보 이미지, 모집 기간을 설정할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-danger-hairline bg-danger-soft px-4 py-3 text-sm text-danger-text">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-lg border border-success-hairline bg-success-soft px-4 py-3 text-sm text-success-text">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-secondary">제목</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClassName}
            disabled={isFormDisabled}
            placeholder="예: 2030 연영회 신입 부원 모집"
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink-secondary">세부 내용</p>
          <RichTextEditor
            value={content}
            onChange={setContent}
            disabled={isFormDisabled}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-secondary">
              모집 시작일시
            </span>
            <input
              type="datetime-local"
              value={isMounted ? recruitmentStartAtInput : ""}
              onChange={(event) => setRecruitmentStartAtInput(event.target.value)}
              className={inputClassName}
              disabled={isFormDisabled}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-secondary">
              모집 종료일시
            </span>
            <input
              type="datetime-local"
              value={isMounted ? recruitmentEndAtInput : ""}
              onChange={(event) => setRecruitmentEndAtInput(event.target.value)}
              className={inputClassName}
              disabled={isFormDisabled}
            />
          </label>
        </div>

        <section className="rounded-lg border border-hairline bg-surface-sunken p-4 md:p-5">
          <p className="text-sm font-semibold text-ink">홍보 이미지</p>
          <p className="mt-1 text-xs text-ink-muted">최대 {RECRUITING_MAX_IMAGES}장</p>

          <button
            type="button"
            data-testid="recruiting-plan-upload"
            onClick={handlePromotionImageUploadClick}
            disabled={isPromotionUploadDisabled}
            className="mt-3 inline-flex rounded-lg border border-hairline-strong px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-canvas-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            파일 업로드
          </button>
          <input
            ref={promotionFileInputRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            multiple
            onChange={(event) => void handleUploadPromotionImages(event)}
            className="sr-only"
            disabled={isPromotionUploadDisabled}
          />

          {isUploadingImage ? (
            <p className="mt-2 text-xs text-ink-muted">이미지 업로드 중...</p>
          ) : null}
          {!isUploadingImage && promotionImageUrls.length >= RECRUITING_MAX_IMAGES ? (
            <p className="mt-2 text-xs text-ink-muted">
              최대 {RECRUITING_MAX_IMAGES}장까지 등록되어 추가 업로드가
              비활성화되었습니다.
            </p>
          ) : null}
          <UploadProgressBar
            progressPercent={uploadProgressPercent}
            label="홍보 이미지 업로드 진행률"
          />

          <div className="mt-3 space-y-2">
            <p className="text-xs text-ink-muted">
              마우스로 끌어 이미지 순서를 바꿀 수 있습니다.
            </p>
            <SortableImageGrid
              items={promotionImageItems.map((item, index) => ({
                id: item.id,
                imageUrl: item.imageUrl,
                label: `홍보 이미지 ${index + 1}`,
                alt: `홍보 이미지 ${index + 1}`,
              }))}
              onReorder={(nextItems) =>
                reorderPromotionImageByIds(nextItems.map((item) => item.id))
              }
              onRemoveItem={removePromotionImageById}
              disabled={isFormDisabled}
              emptyMessage="등록된 홍보 이미지가 없습니다."
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            data-testid="recruiting-plan-save"
            onClick={() => void handleSubmit()}
            disabled={isFormDisabled}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:bg-hairline-strong"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
