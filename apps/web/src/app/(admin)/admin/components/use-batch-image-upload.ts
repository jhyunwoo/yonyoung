"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { uploadWithPresign, type PresignPath } from "../../../../lib/admin-api/upload";

export type BatchImageUploadStatus = "uploading" | "uploaded" | "failed";

export type BatchImageUploadItem = {
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

export const useBatchImageUpload = (presignPath: PresignPath) => {
  const [items, setItems] = useState<BatchImageUploadItem[]>([]);
  const latestTokenRef = useRef(new Map<string, string>());

  const runUpload = useCallback(
    async (itemId: string, file: File) => {
      const token = createLocalId();
      latestTokenRef.current.set(itemId, token);

      setItems((previous) =>
        previous.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: "uploading",
                progress: 0,
                errorMessage: null,
              }
            : item,
        ),
      );

      try {
        const uploadedUrl = await uploadWithPresign({
          presignPath,
          file,
          onProgress: (progress) => {
            if (latestTokenRef.current.get(itemId) !== token) {
              return;
            }
            setItems((previous) =>
              previous.map((item) =>
                item.id === itemId ? { ...item, progress } : item,
              ),
            );
          },
        });

        if (latestTokenRef.current.get(itemId) !== token) {
          return;
        }

        setItems((previous) =>
          previous.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: "uploaded",
                  progress: 100,
                  imageUrl: uploadedUrl,
                  errorMessage: null,
                }
              : item,
          ),
        );
      } catch (error) {
        if (latestTokenRef.current.get(itemId) !== token) {
          return;
        }

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
    [presignPath],
  );

  const addFiles = useCallback(
    (files: File[], startSortOrder: number) => {
      if (files.length === 0) {
        return;
      }

      const nextItems = files.map((file, index) => ({
        id: createLocalId(),
        file,
        fileName: file.name,
        imageUrl: null,
        sortOrder: startSortOrder + index,
        status: "uploading" as const,
        progress: 0,
        errorMessage: null,
      }));

      setItems((previous) => [...previous, ...nextItems]);
      for (const item of nextItems) {
        void runUpload(item.id, item.file);
      }
    },
    [runUpload],
  );

  const retryItem = useCallback(
    (itemId: string) => {
      const target = items.find((item) => item.id === itemId);
      if (!target) {
        return;
      }
      void runUpload(target.id, target.file);
    },
    [items, runUpload],
  );

  const removeItem = useCallback((itemId: string) => {
    latestTokenRef.current.delete(itemId);
    setItems((previous) => previous.filter((item) => item.id !== itemId));
  }, []);

  const setSortOrder = useCallback((itemId: string, sortOrder: number) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === itemId ? { ...item, sortOrder } : item,
      ),
    );
  }, []);

  const clear = useCallback(() => {
    latestTokenRef.current.clear();
    setItems([]);
  }, []);

  const hasUploading = useMemo(
    () => items.some((item) => item.status === "uploading"),
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
    clear,
  };
};
