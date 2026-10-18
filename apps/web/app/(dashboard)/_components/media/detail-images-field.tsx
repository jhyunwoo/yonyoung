"use client";

import { IMAGE_UPLOAD_ACCEPT } from "@yonyoung/contracts";
import { useMemo } from "react";
import type { UploadImageItem } from "@/features/media/upload/image-upload-state";
import type { DetailImageField } from "@/features/media/upload/use-detail-image-field";
import SortableImageGrid from "@/app/(dashboard)/_components/sortable-image-grid";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";
import {
  FILE_SELECT_BUTTON_CLASS_NAME,
  type MediaFieldTestIdPrefix,
} from "@/app/(dashboard)/_components/media/file-select-button";

type DetailImagesFieldProps = {
  /** `${testIdPrefix}-detail-select`가 파일 선택 버튼의 data-testid가 된다. */
  testIdPrefix: MediaFieldTestIdPrefix;
  variant: "create" | "edit";
  field: DetailImageField;
  disabled: boolean;
  uploadProgressPercent: number | null;
};

const toCreateGridItem = (image: UploadImageItem, index: number) => ({
  id: image.id,
  imageUrl: image.imageUrl,
  label: image.file?.name ?? `세부 이미지 ${index + 1}`,
  subtitle: `순서 ${index + 1}`,
});

const toEditGridItem = (image: UploadImageItem, index: number) => ({
  id: image.id,
  imageUrl: image.imageUrl,
  label:
    image.source === "existing"
      ? `기존 이미지 ${index + 1}`
      : (image.file?.name ?? `새 이미지 ${index + 1}`),
  subtitle: image.source === "existing" ? "기존" : "새 업로드",
});

/** 활동·전시 폼의 세부 사진 선택·정렬 칸. */
export default function DetailImagesField({
  testIdPrefix,
  variant,
  field,
  disabled,
  uploadProgressPercent,
}: DetailImagesFieldProps) {
  const { items, inputRef, openPicker, onFilesChange, remove, reorder } = field;
  const isEdit = variant === "edit";
  // 제목을 입력할 때마다 정렬 그리드까지 다시 그리지 않도록 목록이 바뀔 때만 새로 만든다.
  const gridItems = useMemo(
    () => items.map(isEdit ? toEditGridItem : toCreateGridItem),
    [items, isEdit],
  );

  return (
    <div
      className={isEdit ? "space-y-2 rounded-lg border border-hairline p-4" : "space-y-2"}
    >
      {isEdit ? <p className="text-sm font-semibold text-ink">세부 이미지</p> : null}
      <label className="block space-y-1">
        {isEdit ? (
          <span className="text-xs text-ink-muted">
            새 세부 이미지 추가 (선택, 여러 장)
          </span>
        ) : (
          <span className="text-sm font-semibold text-ink">
            세부 이미지 (선택, 여러 장)
          </span>
        )}
        <button
          type="button"
          data-testid={`${testIdPrefix}-detail-select`}
          onClick={openPicker}
          disabled={disabled}
          className={FILE_SELECT_BUTTON_CLASS_NAME}
        >
          파일 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          multiple
          onChange={onFilesChange}
          disabled={disabled}
          className="sr-only"
        />
      </label>
      <p className="text-xs text-ink-muted">
        마우스로 끌어 세부 이미지 순서를 바꿀 수 있습니다.
      </p>
      <SortableImageGrid
        items={gridItems}
        onReorder={reorder}
        onRemoveItem={remove}
        disabled={disabled}
        emptyMessage={
          isEdit
            ? "등록된 세부 이미지가 없습니다."
            : "추가할 세부 이미지가 없으면 비워 두세요."
        }
      />
      <UploadProgressBar
        progressPercent={uploadProgressPercent}
        label="사진 업로드 진행률"
      />
    </div>
  );
}
