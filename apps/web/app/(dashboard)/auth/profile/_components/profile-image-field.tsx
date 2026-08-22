"use client";

import type { ChangeEvent, RefObject } from "react";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";

type ProfileImageFieldProps = {
  previewUrl: string;
  canEdit: boolean;
  isSaving: boolean;
  uploadProgressPercent: number | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onOpenFilePicker: () => void;
  onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function ProfileImageField({
  previewUrl,
  canEdit,
  isSaving,
  uploadProgressPercent,
  fileInputRef,
  onOpenFilePicker,
  onSelectFile,
}: ProfileImageFieldProps) {
  return (
    <div className="rounded-lg border border-hairline p-4">
      <p className="text-sm font-semibold text-ink">프로필 이미지</p>
      <p className="mt-1 text-xs text-ink-muted">
        {canEdit
          ? "프로필 사진을 수정할 수 있습니다."
          : "현재 권한에서는 프로필 사진을 수정할 수 없습니다."}
      </p>

      <div className="mt-3 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 aspect-square overflow-hidden rounded-full border border-hairline bg-surface-sunken">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="프로필 이미지 미리보기"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-muted">
              없음
            </div>
          )}
        </div>

        <button
          type="button"
          data-testid="auth-profile-image-select"
          onClick={onOpenFilePicker}
          disabled={!canEdit || isSaving}
          className="inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
        >
          사진 선택
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          disabled={!canEdit || isSaving}
          onChange={onSelectFile}
          className="sr-only"
        />
      </div>

      <UploadProgressBar progressPercent={uploadProgressPercent} />
    </div>
  );
}
