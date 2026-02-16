"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ImageInputProps = {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  uploadProgress?: number | null;
  isUploading?: boolean;
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
  disabled = false,
  uploadProgress = null,
  isUploading = false,
  testIdPrefix,
}: ImageInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="space-y-1">
        <input
          type="file"
          accept="image/*"
          onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) => onFileChange(event.target.files?.[0] ?? null)}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          data-testid={`${testIdPrefix}-file`}
        />
        <p className="text-xs text-gray-500" data-testid={`${testIdPrefix}-file-name`}>
          {file ? file.name : "선택된 파일 없음"}
        </p>
      </div>

      {previewUrl ? (
        <div className="space-y-1" data-testid={`${testIdPrefix}-preview`}>
          <p className="text-xs text-gray-500">선택한 이미지 미리보기</p>
          <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            <Image
              src={previewUrl}
              alt={`${label} 미리보기`}
              width={960}
              height={540}
              className="h-40 w-full object-cover"
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
    </div>
  );
}
