"use client";

import { IMAGE_UPLOAD_ACCEPT } from "@yonyoung/contracts";
import Image from "next/image";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";
import type { useSelectedImageFile } from "@/features/media/upload/use-selected-image-file";
import {
  FILE_SELECT_BUTTON_CLASS_NAME,
  type MediaFieldTestIdPrefix,
} from "@/app/(dashboard)/_components/media/file-select-button";

type CoverImageFieldProps = {
  /** `${testIdPrefix}-cover-select`가 파일 선택 버튼의 data-testid가 된다. */
  testIdPrefix: MediaFieldTestIdPrefix;
  cover: ReturnType<typeof useSelectedImageFile>;
  disabled: boolean;
  /** 수정 폼에서 지금 등록된 대표 사진. 있으면 "교체(선택)" 형태로 그린다. */
  currentImage?: { url: string; alt: string };
};

/** 활동·전시 폼의 대표 사진 선택 칸. */
export default function CoverImageField({
  testIdPrefix,
  cover,
  disabled,
  currentImage,
}: CoverImageFieldProps) {
  const { selectedFile, fileInputRef, previewUrl, selectFile, openFilePicker } = cover;
  const controls = (
    <>
      <button
        type="button"
        data-testid={`${testIdPrefix}-cover-select`}
        onClick={openFilePicker}
        disabled={disabled}
        className={FILE_SELECT_BUTTON_CLASS_NAME}
      >
        파일 선택
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        onChange={selectFile}
        disabled={disabled}
        className="sr-only"
      />
    </>
  );

  if (!currentImage) {
    return (
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-ink">대표 이미지 (필수)</span>
        {controls}
        <p className="text-xs text-ink-muted">
          {selectedFile
            ? `선택됨: ${selectedFile.name}`
            : "아직 파일이 선택되지 않았습니다."}
        </p>
        {previewUrl ? (
          <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="대표 이미지 미리보기"
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </label>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-hairline p-4">
      <p className="text-sm font-semibold text-ink">대표 이미지 교체 (선택)</p>
      <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
        <Image
          src={currentImage.url}
          alt={currentImage.alt}
          fill
          className="object-cover"
          unoptimized={shouldUseUnoptimizedImage(currentImage.url)}
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
      {controls}
      <p className="text-xs text-ink-muted">
        {selectedFile
          ? `선택됨: ${selectedFile.name}`
          : "대표 이미지를 교체하지 않으려면 비워 두세요."}
      </p>
      {previewUrl ? (
        <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg border border-success-hairline bg-success-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="새 대표 이미지 미리보기"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
