"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ImmediateUploadStatus } from "./use-immediate-image-upload";

type ImageInputProps = {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  currentUrl?: string | null;
  status?: ImmediateUploadStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  uploadProgress?: number | null;
  isUploading?: boolean;
  previewShape?: "default" | "avatar";
  testIdPrefix: string;
};

/**
 * ImageInput 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  label,
  file,
  onFileChange,
  disabled = false,
  testIdPrefix,
} 대상을 식별하기 위한 ID 값입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default function ImageInput({
  label,
  file,
  onFileChange,
  currentUrl = null,
  status = "idle",
  errorMessage = null,
  onRetry,
  disabled = false,
  uploadProgress = null,
  isUploading = false,
  previewShape = "default",
  testIdPrefix,
}: ImageInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputId = `${testIdPrefix}-file-input`;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  const progressValue =
    typeof uploadProgress === "number"
      ? Math.max(0, Math.min(100, uploadProgress))
      : null;
  const previewImageUrl = previewUrl ?? currentUrl;
  const isAvatarPreview = previewShape === "avatar";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="space-y-1.5">
        <label
          htmlFor={fileInputId}
          className={`relative block rounded-xl border-2 border-dashed p-4 transition ${
            disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100"
              : "cursor-pointer border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            disabled={disabled}
            aria-label={`${label} 파일 선택`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            data-testid={`${testIdPrefix}-file`}
          />
          <div className="pointer-events-none flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">이미지 파일 선택</p>
              <p className="mt-0.5 text-xs text-gray-500">
                클릭해서 업로드할 이미지를 선택하세요. (JPG, PNG, WEBP)
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700">
              {file ? "다시 선택" : "파일 찾기"}
            </span>
          </div>
        </label>

        <p className="text-xs text-gray-500" data-testid={`${testIdPrefix}-file-name`}>
          {file ? file.name : "선택된 파일 없음"}
        </p>
      </div>

      {previewImageUrl ? (
        <div className="space-y-1" data-testid={`${testIdPrefix}-preview`}>
          <p className="text-xs text-gray-500">
            {previewUrl ? "선택한 이미지 미리보기" : "현재 이미지"}
          </p>
          <div
            className={`overflow-hidden border border-gray-200 bg-gray-50 ${
              isAvatarPreview ? "h-40 w-40 rounded-full" : "rounded-md"
            }`}
          >
            <Image
              src={previewImageUrl}
              alt={`${label} 미리보기`}
              width={isAvatarPreview ? 320 : 960}
              height={isAvatarPreview ? 320 : 540}
              className={isAvatarPreview ? "h-full w-full object-cover" : "h-40 w-full object-cover"}
              unoptimized
            />
          </div>
        </div>
      ) : null}

      {isUploading || progressValue !== null ? (
        <div className="space-y-1" data-testid={`${testIdPrefix}-upload-progress`}>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-black transition-[width] duration-200"
              style={{ width: `${progressValue ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            업로드 진행률: {progressValue ?? 0}%
          </p>
        </div>
      ) : null}

      {status === "uploaded" && !isUploading ? (
        <p className="text-xs text-green-700" data-testid={`${testIdPrefix}-upload-success`}>
          이미지 업로드 완료
        </p>
      ) : null}

      {status === "failed" ? (
        <div className="space-y-1" data-testid={`${testIdPrefix}-upload-error`}>
          <p className="text-xs text-red-700">{errorMessage ?? "이미지 업로드에 실패했습니다."}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              data-testid={`${testIdPrefix}-upload-retry`}
            >
              업로드 재시도
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
