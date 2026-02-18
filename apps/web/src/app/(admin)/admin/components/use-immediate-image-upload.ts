"use client";

import { useCallback, useRef, useState } from "react";
import { uploadWithPresign, type PresignPath } from "../../../../lib/admin-api/upload";

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

export const useImmediateImageUpload = ({
  presignPath,
  initialUrl = null,
}: UseImmediateImageUploadInput) => {
  const [file, setFile] = useState<File | null>(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<ImmediateUploadStatus>(
    initialUrl ? "uploaded" : "idle",
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latestUploadTokenRef = useRef(0);

  const runUpload = useCallback(
    async (nextFile: File) => {
      const uploadToken = Date.now() + Math.random();
      latestUploadTokenRef.current = uploadToken;

      setFile(nextFile);
      setStatus("uploading");
      setProgress(0);
      setErrorMessage(null);

      try {
        const uploadedUrl = await uploadWithPresign({
          presignPath,
          file: nextFile,
          onProgress: setProgress,
        });

        if (latestUploadTokenRef.current !== uploadToken) {
          return;
        }

        setCurrentUrl(uploadedUrl);
        setStatus("uploaded");
        setProgress(100);
      } catch (error) {
        if (latestUploadTokenRef.current !== uploadToken) {
          return;
        }
        setStatus("failed");
        setErrorMessage(readUploadErrorMessage(error));
      }
    },
    [presignPath],
  );

  const selectFile = useCallback(
    (nextFile: File | null) => {
      if (!nextFile) {
        return;
      }
      void runUpload(nextFile);
    },
    [runUpload],
  );

  const retry = useCallback(() => {
    if (!file) {
      return;
    }
    void runUpload(file);
  }, [file, runUpload]);

  const reset = useCallback((nextUrl?: string | null) => {
    latestUploadTokenRef.current = Date.now() + Math.random();
    setFile(null);
    const resolvedNextUrl = nextUrl ?? "";
    setCurrentUrl(resolvedNextUrl);
    setStatus(resolvedNextUrl ? "uploaded" : "idle");
    setProgress(null);
    setErrorMessage(null);
  }, []);

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

