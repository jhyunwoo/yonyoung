"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PresignPath } from "../../../../lib/admin-api/upload";
import { createUppyPresignedUploader } from "./uppy-presigned-upload";

export type ImmediateUploadStatus = "idle" | "uploading" | "uploaded" | "failed";

type UseImmediateImageUploadInput = {
  presignPath: PresignPath;
  initialUrl?: string | null;
};

const readUploadErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "이미지 업로드에 실패했습니다.";
};

const readProgressPercent = (
  progress: {
    bytesUploaded?: number | null;
    bytesTotal?: number | null;
  } | null,
): number => {
  const uploaded = progress?.bytesUploaded ?? 0;
  const total = progress?.bytesTotal ?? 0;
  if (total <= 0) {
    return 0;
  }
  const value = Math.round((uploaded / total) * 100);
  return Math.max(0, Math.min(100, value));
};

const readFileId = (candidate: unknown): string | null => {
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const record = candidate as { id?: unknown };
  return typeof record.id === "string" ? record.id : null;
};

export const useImmediateImageUpload = ({
  presignPath,
  initialUrl = null,
}: UseImmediateImageUploadInput) => {
  const uploaderRef = useRef<ReturnType<typeof createUppyPresignedUploader> | null>(null);
  const activeFileIdRef = useRef<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<ImmediateUploadStatus>(
    initialUrl ? "uploaded" : "idle",
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getUploader = useCallback(() => {
    if (!uploaderRef.current) {
      uploaderRef.current = createUppyPresignedUploader(presignPath);
    }
    return uploaderRef.current;
  }, [presignPath]);

  useEffect(() => {
    const uploader = getUploader();
    const { uppy } = uploader;

    const handleProgress = (
      nextFile: unknown,
      nextProgress: { bytesUploaded?: number | null; bytesTotal?: number | null },
    ) => {
      const nextFileId = readFileId(nextFile);
      if (!nextFileId) {
        return;
      }
      if (nextFileId !== activeFileIdRef.current) {
        return;
      }
      setProgress(readProgressPercent(nextProgress));
    };

    const handleSuccess = (nextFile: unknown) => {
      const nextFileId = readFileId(nextFile);
      if (!nextFileId) {
        return;
      }
      if (nextFileId !== activeFileIdRef.current) {
        return;
      }

      const uploadedUrl = uploader.getPublicUrl(nextFileId);
      if (!uploadedUrl) {
        setStatus("failed");
        setProgress(null);
        setErrorMessage("업로드 URL을 확인하지 못했습니다.");
        return;
      }

      setCurrentUrl(uploadedUrl);
      setStatus("uploaded");
      setProgress(100);
      setErrorMessage(null);
      uploader.clearFile(nextFileId);
    };

    const handleError = (nextFile: unknown, error: Error) => {
      const nextFileId = readFileId(nextFile);
      if (nextFileId && nextFileId !== activeFileIdRef.current) {
        return;
      }
      setStatus("failed");
      setProgress(null);
      setErrorMessage(readUploadErrorMessage(error));
    };

    const handleRestrictionFailed = (_nextFile: unknown, error: Error) => {
      setStatus("failed");
      setProgress(null);
      setErrorMessage(readUploadErrorMessage(error));
    };

    uppy.on("upload-progress", handleProgress);
    uppy.on("upload-success", handleSuccess);
    uppy.on("upload-error", handleError);
    uppy.on("restriction-failed", handleRestrictionFailed);

    return () => {
      uppy.off("upload-progress", handleProgress);
      uppy.off("upload-success", handleSuccess);
      uppy.off("upload-error", handleError);
      uppy.off("restriction-failed", handleRestrictionFailed);
    };
  }, [getUploader]);

  useEffect(
    () => () => {
      uploaderRef.current?.destroy();
      uploaderRef.current = null;
    },
    [],
  );

  const selectFile = useCallback((nextFile: File | null) => {
    if (!nextFile) {
      return;
    }

    const uploader = getUploader();
    const previousFileId = activeFileIdRef.current;

    if (previousFileId) {
      uploader.clearFile(previousFileId);
      if (uploader.uppy.getFile(previousFileId)) {
        uploader.uppy.removeFile(previousFileId);
      }
    }

    const nextFileId = `single-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    activeFileIdRef.current = nextFileId;

    setFile(nextFile);
    setStatus("uploading");
    setProgress(0);
    setErrorMessage(null);

    try {
      uploader.uppy.addFile({
        id: nextFileId,
        name: nextFile.name,
        type: nextFile.type,
        data: nextFile,
      });
    } catch (error) {
      setStatus("failed");
      setProgress(null);
      setErrorMessage(readUploadErrorMessage(error));
    }
  }, [getUploader]);

  const retry = useCallback(() => {
    if (!file) {
      return;
    }
    selectFile(file);
  }, [file, selectFile]);

  const reset = useCallback((nextUrl?: string | null) => {
    const uploader = getUploader();
    const previousFileId = activeFileIdRef.current;
    if (previousFileId) {
      uploader.clearFile(previousFileId);
      if (uploader.uppy.getFile(previousFileId)) {
        uploader.uppy.removeFile(previousFileId);
      }
    }

    activeFileIdRef.current = null;
    setFile(null);

    const resolvedNextUrl = nextUrl ?? "";
    setCurrentUrl(resolvedNextUrl);
    setStatus(resolvedNextUrl ? "uploaded" : "idle");
    setProgress(null);
    setErrorMessage(null);
  }, [getUploader]);

  return {
    file,
    currentUrl,
    status,
    progress,
    errorMessage,
    isUploading: status === "uploading",
    isReady: status === "idle" || status === "uploaded",
    hasUploadError: status === "failed",
    selectFile,
    retry,
    reset,
    setCurrentUrl,
  };
};
