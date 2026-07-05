"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { FileText, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  type ApiAttachment,
  type ApiAttachmentScope,
} from "@/shared/contracts/api-contracts";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  PRESIGN_PATHS,
  uploadWithPresign,
} from "@/features/dashboard/api/admin-api/upload";
import { AdminApiError } from "@/shared/http/http";
import UploadProgressBar from "@/app/(dashboard)/_components/upload-progress-bar";

type AttachmentManagerProps = {
  /** "activity": 활동 자료 (resourceId 필수), "site_donate": 후원 페이지 자료 */
  scope: ApiAttachmentScope;
  resourceId?: string;
};

/** 파일 크기를 사람이 읽기 좋은 단위로 변환합니다. */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }
  return "첨부파일 처리 중 오류가 발생했습니다.";
};

/**
 * 관리자용 첨부파일 관리 컴포넌트 (회계 자료, 월간연영회 PDF 등).
 *
 * 업로드 흐름: 파일 선택 → 제목 입력 → presigned URL로 R2 직접 업로드 →
 * 첨부 메타데이터(제목/파일명/크기/타입) 등록 → 목록 갱신.
 * 사이트 설정 폼(scope=site_donate)과 활동 편집 폼(scope=activity)에서 재사용됩니다.
 */
export default function AttachmentManager({ scope, resourceId }: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<ApiAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reloadAttachments = useCallback(async () => {
    const rows = await adminResourceApi.listAttachments(scope, resourceId);
    setAttachments(rows);
  }, [scope, resourceId]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await adminResourceApi.listAttachments(scope, resourceId);
        if (mounted) {
          setAttachments(rows);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(readErrorMessage(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [scope, resourceId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!nextFile) {
      return;
    }

    setSelectedFile(nextFile);
    // 제목 미입력 시 확장자를 뗀 파일명을 기본 제목으로 제안
    if (title.trim().length === 0) {
      setTitle(nextFile.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || isSaving) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("첨부파일 제목을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setUploadProgressPercent(0);

    try {
      const fileUrl = await uploadWithPresign({
        presignPath:
          scope === "site_donate" ? PRESIGN_PATHS.siteFile : PRESIGN_PATHS.activityFile,
        file: selectedFile,
        onProgress: setUploadProgressPercent,
      });

      await adminResourceApi.createAttachment({
        scope,
        resourceId: resourceId ?? null,
        title: trimmedTitle,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "application/pdf",
        sortOrder: attachments.length,
      });

      setTitle("");
      setSelectedFile(null);
      await reloadAttachments();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
      setUploadProgressPercent(null);
    }
  };

  const handleDelete = async (attachment: ApiAttachment) => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await adminResourceApi.deleteAttachment(attachment.id, scope);
      await reloadAttachments();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  /** 인접한 항목과 sortOrder를 맞바꿔 순서를 이동합니다. */
  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (isSaving || targetIndex < 0 || targetIndex >= attachments.length) {
      return;
    }

    const current = attachments[index];
    const target = attachments[targetIndex];
    if (!current || !target) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await adminResourceApi.updateAttachment(current.id, scope, {
        sortOrder: targetIndex,
      });
      await adminResourceApi.updateAttachment(target.id, scope, {
        sortOrder: index,
      });
      await reloadAttachments();
    } catch (error) {
      setErrorMessage(readErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="attachment-manager">
      <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            첨부파일 제목
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 2026년 6월 회계 내역"
            maxLength={200}
            disabled={isSaving}
            data-testid="attachment-title-input"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-50"
          />
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
          data-testid="attachment-file-input"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
            data-testid="attachment-select-file-button"
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            파일 선택
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {selectedFile
              ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
              : "PDF, 엑셀, 워드, 한글, ZIP 파일을 첨부할 수 있습니다."}
          </span>
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={isSaving || !selectedFile}
            data-testid="attachment-upload-button"
            className="ml-auto rounded-lg bg-slate-900 dark:bg-slate-50 px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 disabled:opacity-50"
          >
            업로드
          </button>
        </div>

        <UploadProgressBar
          progressPercent={uploadProgressPercent}
          label="첨부파일 업로드 진행률"
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          첨부파일 목록을 불러오는 중...
        </p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          등록된 첨부파일이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="attachment-list">
          {attachments.map((attachment, index) => (
            <li
              key={attachment.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
            >
              <FileText
                className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {attachment.title}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {attachment.fileName} · {formatFileSize(attachment.fileSize)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleMove(index, -1)}
                disabled={isSaving || index === 0}
                aria-label="첨부파일 순서 위로 이동"
                data-testid="attachment-move-up-button"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void handleMove(index, 1)}
                disabled={isSaving || index === attachments.length - 1}
                aria-label="첨부파일 순서 아래로 이동"
                data-testid="attachment-move-down-button"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(attachment)}
                disabled={isSaving}
                aria-label="첨부파일 삭제"
                data-testid="attachment-delete-button"
                className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
