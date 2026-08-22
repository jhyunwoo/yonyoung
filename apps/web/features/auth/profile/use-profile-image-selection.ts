"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

/**
 * 프로필 사진 선택 상태와 objectURL 수명을 함께 관리한다.
 * objectURL은 브라우저가 붙잡고 있는 외부 자원이라 교체/언마운트 시 반드시 해제해야 한다.
 */
export const useProfileImageSelection = (initialImageUrl: string) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewObjectUrl]);

  const clearPreview = () => {
    setPreviewObjectUrl((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return null;
    });
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    clearPreview();
    setSelectedFile(nextFile);

    if (nextFile) {
      setPreviewObjectUrl(URL.createObjectURL(nextFile));
    }
  };

  const reset = (nextImageUrl: string) => {
    setImageUrl(nextImageUrl);
    clearPreview();
    setSelectedFile(null);
  };

  return {
    imageUrl,
    selectedFile,
    fileInputRef,
    previewUrl: previewObjectUrl ?? imageUrl,
    selectFile,
    openFilePicker: () => fileInputRef.current?.click(),
    reset,
  };
};
