"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

/**
 * 단일 이미지 파일 선택과 미리보기 objectURL 수명을 함께 관리한다.
 * objectURL은 브라우저가 붙잡고 있는 외부 자원이라 교체/언마운트 시 반드시 해제해야 한다.
 */
export const useSelectedImageFile = (initialImageUrl = "") => {
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

  return {
    imageUrl,
    selectedFile,
    fileInputRef,
    /** 새로 고른 파일이 있으면 그 미리보기를, 없으면 기존 이미지를 보여 준다. */
    previewUrl: previewObjectUrl ?? imageUrl,
    selectFile,
    openFilePicker: () => fileInputRef.current?.click(),
    reset: (nextImageUrl: string) => {
      setImageUrl(nextImageUrl);
      clearPreview();
      setSelectedFile(null);
    },
  };
};
