"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PresignPath } from "../../../../lib/admin-api/upload";
import { createUppyPresignedUploader } from "./uppy-presigned-upload";

type BatchImageUploadStatus = "pending" | "uploading" | "uploaded" | "failed";

type BatchImageUploadItem = {
  id: string;
  file: File;
  fileName: string;
  imageUrl: string | null;
  sortOrder: number;
  status: BatchImageUploadStatus;
  progress: number;
  errorMessage: string | null;
};

const readUploadErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "이미지 업로드에 실패했습니다.";
};

const createLocalId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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

const normalizeSortOrder = (items: BatchImageUploadItem[]): BatchImageUploadItem[] =>
  items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));

const readFileId = (candidate: unknown): string | null => {
  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }
  const record = candidate as { id?: unknown };
  return typeof record.id === "string" ? record.id : null;
};

export const useBatchImageUpload = (presignPath: PresignPath) => {
  const uploaderRef = useRef<ReturnType<typeof createUppyPresignedUploader> | null>(null);
  const localIdByUppyIdRef = useRef<Map<string, string>>(new Map());
  const uppyIdByLocalIdRef = useRef<Map<string, string>>(new Map());
  const [items, setItems] = useState<BatchImageUploadItem[]>([]);

  const getUploader = useCallback(() => {
    if (!uploaderRef.current) {
      uploaderRef.current = createUppyPresignedUploader(presignPath);
    }
    return uploaderRef.current;
  }, [presignPath]);

  useEffect(() => {
    const uploader = getUploader();
    const { uppy } = uploader;
    const uppyEventApi = uppy as unknown as {
      on: (eventName: string, callback: (...args: unknown[]) => void) => void;
      off: (eventName: string, callback: (...args: unknown[]) => void) => void;
    };

    const handleUploadStarted = (file: unknown) => {
      const uppyFileId = readFileId(file);
      if (!uppyFileId) {
        return;
      }
      const localId = localIdByUppyIdRef.current.get(uppyFileId);
      if (!localId) {
        return;
      }
      setItems((previous) =>
        previous.map((item) =>
          item.id === localId
            ? {
                ...item,
                status: "uploading",
                progress: item.progress > 0 ? item.progress : 1,
                errorMessage: null,
              }
            : item,
        ),
      );
    };

    const handleProgress = (
      file: unknown,
      progress: { bytesUploaded?: number | null; bytesTotal?: number | null },
    ) => {
      const uppyFileId = readFileId(file);
      if (!uppyFileId) {
        return;
      }
      const localId = localIdByUppyIdRef.current.get(uppyFileId);
      if (!localId) {
        return;
      }
      const nextProgress = readProgressPercent(progress);
      setItems((previous) =>
        previous.map((item) =>
          item.id === localId
            ? {
                ...item,
                status: "uploading",
                progress:
                  nextProgress > 0
                    ? nextProgress
                    : item.progress > 0
                      ? item.progress
                      : 1,
                errorMessage: null,
              }
            : item,
        ),
      );
    };

    const handleSuccess = (file: unknown) => {
      const uppyFileId = readFileId(file);
      if (!uppyFileId) {
        return;
      }
      const localId = localIdByUppyIdRef.current.get(uppyFileId);
      if (!localId) {
        return;
      }
      const uploadedUrl = uploader.getPublicUrl(uppyFileId);
      setItems((previous) =>
        previous.map((item) =>
          item.id === localId
            ? {
                ...item,
                status: uploadedUrl ? "uploaded" : "failed",
                progress: uploadedUrl ? 100 : 0,
                imageUrl: uploadedUrl,
                errorMessage: uploadedUrl ? null : "업로드 URL을 확인하지 못했습니다.",
              }
            : item,
        ),
      );
      uploader.clearFile(uppyFileId);
      if (uploader.uppy.getFile(uppyFileId)) {
        uploader.uppy.removeFile(uppyFileId);
      }
      localIdByUppyIdRef.current.delete(uppyFileId);
      uppyIdByLocalIdRef.current.delete(localId);
    };

    const handleError = (file: unknown, error: Error) => {
      const uppyFileId = readFileId(file);
      if (!uppyFileId) {
        return;
      }
      const localId = localIdByUppyIdRef.current.get(uppyFileId);
      if (!localId) {
        return;
      }
      setItems((previous) =>
        previous.map((item) =>
          item.id === localId
            ? {
                ...item,
                status: "failed",
                progress: 0,
                errorMessage: readUploadErrorMessage(error),
              }
            : item,
        ),
      );
    };

    const handleRestrictionFailed = (file: unknown, error: Error) => {
      const uppyFileId = readFileId(file);
      if (!uppyFileId) {
        return;
      }
      const localId = localIdByUppyIdRef.current.get(uppyFileId);
      if (!localId) {
        return;
      }
      setItems((previous) =>
        previous.map((item) =>
          item.id === localId
            ? {
                ...item,
                status: "failed",
                progress: 0,
                errorMessage: readUploadErrorMessage(error),
              }
            : item,
        ),
      );
    };

    uppyEventApi.on("upload-started", handleUploadStarted);
    uppy.on("upload-progress", handleProgress);
    uppy.on("upload-success", handleSuccess);
    uppy.on("upload-error", handleError);
    uppy.on("restriction-failed", handleRestrictionFailed);

    return () => {
      uppyEventApi.off("upload-started", handleUploadStarted);
      uppy.off("upload-progress", handleProgress);
      uppy.off("upload-success", handleSuccess);
      uppy.off("upload-error", handleError);
      uppy.off("restriction-failed", handleRestrictionFailed);
    };
  }, [getUploader]);

  useEffect(
    () => () => {
      localIdByUppyIdRef.current.clear();
      uppyIdByLocalIdRef.current.clear();
      uploaderRef.current?.destroy();
      uploaderRef.current = null;
    },
    [],
  );

  const addFiles = useCallback((files: File[], startSortOrder: number) => {
    if (files.length === 0) {
      return;
    }

    const uploader = getUploader();
    const nextItems = files.map((file, index) => {
      const itemId = createLocalId();
      return {
        id: itemId,
        file,
        fileName: file.name,
        imageUrl: null,
        sortOrder: startSortOrder + index,
        status: "pending" as const,
        progress: 0,
        errorMessage: null,
      };
    });

    setItems((previous) => [...previous, ...nextItems]);

    for (const item of nextItems) {
      try {
        const uppyFileId = uploader.uppy.addFile({
          name: item.fileName,
          type: item.file.type,
          data: item.file,
        });
        localIdByUppyIdRef.current.set(uppyFileId, item.id);
        uppyIdByLocalIdRef.current.set(item.id, uppyFileId);
      } catch (error) {
        setItems((previous) =>
          previous.map((previousItem) =>
            previousItem.id === item.id
              ? {
                  ...previousItem,
                  status: "failed",
                  progress: 0,
                  errorMessage: readUploadErrorMessage(error),
                }
              : previousItem,
          ),
        );
      }
    }
  }, [getUploader]);

  const retryItem = useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (!target) {
        return;
      }

      const uploader = getUploader();
      const previousUppyFileId = uppyIdByLocalIdRef.current.get(itemId);
      if (previousUppyFileId) {
        uploader.clearFile(previousUppyFileId);
        if (uploader.uppy.getFile(previousUppyFileId)) {
          uploader.uppy.removeFile(previousUppyFileId);
        }
        localIdByUppyIdRef.current.delete(previousUppyFileId);
      }
      uppyIdByLocalIdRef.current.delete(itemId);

      setItems((previous) =>
        previous.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "pending",
                progress: 0,
                imageUrl: null,
                errorMessage: null,
              }
            : item,
        ),
      );

      try {
        const nextUppyFileId = uploader.uppy.addFile({
          name: target.fileName,
          type: target.file.type,
          data: target.file,
        });
        localIdByUppyIdRef.current.set(nextUppyFileId, target.id);
        uppyIdByLocalIdRef.current.set(target.id, nextUppyFileId);
      } catch (error) {
        setItems((previous) =>
          previous.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "failed",
                  progress: 0,
                  errorMessage: readUploadErrorMessage(error),
                }
              : item,
          ),
        );
      }
    },
    [getUploader, items],
  );

  const removeItem = useCallback((itemId: string) => {
    const uploader = getUploader();
    const uppyFileId = uppyIdByLocalIdRef.current.get(itemId);
    if (uppyFileId) {
      uploader.clearFile(uppyFileId);
      if (uploader.uppy.getFile(uppyFileId)) {
        uploader.uppy.removeFile(uppyFileId);
      }
      localIdByUppyIdRef.current.delete(uppyFileId);
      uppyIdByLocalIdRef.current.delete(itemId);
    }

    setItems((previous) => previous.filter((item) => item.id !== itemId));
  }, [getUploader]);

  const setSortOrder = useCallback((itemId: string, sortOrder: number) => {
    setItems((previous) =>
      previous.map((item) => (item.id === itemId ? { ...item, sortOrder } : item)),
    );
  }, []);

  const moveItem = useCallback((draggedItemId: string, targetItemId: string) => {
    if (draggedItemId === targetItemId) {
      return;
    }

    setItems((previous) => {
      const sourceIndex = previous.findIndex((item) => item.id === draggedItemId);
      const targetIndex = previous.findIndex((item) => item.id === targetItemId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return previous;
      }

      const next = [...previous];
      const [dragged] = next.splice(sourceIndex, 1);
      if (!dragged) {
        return previous;
      }
      next.splice(targetIndex, 0, dragged);
      return normalizeSortOrder(next);
    });
  }, []);

  const clear = useCallback(() => {
    getUploader().clearAll();
    localIdByUppyIdRef.current.clear();
    uppyIdByLocalIdRef.current.clear();
    setItems([]);
  }, [getUploader]);

  const hasUploading = useMemo(
    () => items.some((item) => item.status === "pending" || item.status === "uploading"),
    [items],
  );
  const hasError = useMemo(
    () => items.some((item) => item.status === "failed"),
    [items],
  );
  const uploadedItems = useMemo(
    () =>
      items.filter(
        (item): item is BatchImageUploadItem & { imageUrl: string } =>
          item.status === "uploaded" && Boolean(item.imageUrl),
      ),
    [items],
  );

  return {
    items,
    hasUploading,
    hasError,
    uploadedItems,
    addFiles,
    retryItem,
    removeItem,
    setSortOrder,
    moveItem,
    clear,
  };
};
