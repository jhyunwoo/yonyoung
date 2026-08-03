import { ExternalLink, FileText } from "lucide-react";
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

const rowClassName =
  "pressable flex items-center gap-3 rounded-lg border border-(--surface-border) bg-(--surface-muted) px-4 py-3 no-underline transition hover:border-(--text-muted)";

/**
 * 공개 첨부파일 목록 — 서버 컴포넌트.
 *
 * 두 종류의 항목을 렌더링합니다:
 * - 파일 항목: same-origin 미디어 URL이므로 <a download>로 한글 원본 파일명을 지정해 다운로드.
 *   (API의 Content-Disposition은 직접 접근 시의 ASCII 폴백)
 * - 링크 항목(구글 독스 등): 새 탭으로 외부 링크를 엽니다.
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
          {attachment.linkUrl ? (
            <a
              href={attachment.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClassName}
            >
              <ExternalLink
                className="h-5 w-5 shrink-0 text-(--text-muted)"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem] font-semibold text-(--text-primary)">
                  {attachment.title}
                </span>
                <span className="block truncate text-[0.8rem] text-(--text-muted)">
                  {attachment.linkUrl}
                </span>
              </span>
              <span className="shrink-0 text-[0.85rem] font-semibold text-(--text-secondary)">
                링크 열기
              </span>
            </a>
          ) : (
            <a
              href={attachment.fileUrl ?? "#"}
              download={attachment.fileName ?? undefined}
              className={rowClassName}
            >
              <FileText className="h-5 w-5 shrink-0 text-(--text-muted)" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem] font-semibold text-(--text-primary)">
                  {attachment.title}
                </span>
                <span className="block truncate text-[0.8rem] text-(--text-muted)">
                  {attachment.fileName ?? "파일"} ·{" "}
                  {formatFileSize(attachment.fileSize ?? 0)}
                </span>
              </span>
              <span className="shrink-0 text-[0.85rem] font-semibold text-(--text-secondary)">
                다운로드
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
