import { FileText } from "lucide-react";
import type { ApiAttachment } from "@/shared/contracts/api-contracts";

type AttachmentListProps = {
  attachments: ApiAttachment[];
  "data-testid"?: string;
};

/** 파일 크기를 사람이 읽기 좋은 단위로 변환합니다. */
const formatFileSize = (bytes: number): string => {
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

/**
 * 공개 첨부파일 다운로드 목록 — 서버 컴포넌트.
 *
 * 미디어 URL은 웹 프록시(/api/*)를 거쳐 same-origin이므로
 * <a download> 속성으로 한글 원본 파일명을 지정할 수 있습니다.
 * (API의 Content-Disposition은 직접 접근 시의 ASCII 폴백)
 */
export function AttachmentList({
  attachments,
  "data-testid": dataTestId,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <ul className="m-0 list-none space-y-2 p-0" data-testid={dataTestId}>
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <a
            href={attachment.fileUrl}
            download={attachment.fileName}
            className="flex items-center gap-3 rounded-lg border border-(--surface-border) bg-(--surface-muted) px-4 py-3 no-underline transition hover:border-(--text-muted)"
          >
            <FileText
              className="h-5 w-5 shrink-0 text-(--text-muted)"
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.95rem] font-semibold text-(--text-primary)">
                {attachment.title}
              </span>
              <span className="block truncate text-[0.8rem] text-(--text-muted)">
                {attachment.fileName} · {formatFileSize(attachment.fileSize)}
              </span>
            </span>
            <span className="shrink-0 text-[0.85rem] font-semibold text-(--text-secondary)">
              다운로드
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
