import Link from "next/link";
import { formatKoreanDate } from "../../../lib/date-formatters";
import { formatAuditActor } from "../../../lib/audit-display";
import { readServerCookieHeader } from "../../../lib/admin-generation-server";
import {
  listCachedGenerationNotices,
  listCachedGlobalNotices,
} from "../../../lib/admin-dashboard-cache";
import {
  buildNoticePreview,
  buildRoleLabel,
  normalizeNotices,
  type NoticeItem,
  type NoticeScope,
} from "./notice-shared";

type NoticeManagerProps = {
  scope: NoticeScope;
  generationId?: string;
  canWrite: boolean;
  heading: string;
  description: string;
  emptyMessage: string;
  basePath: string;
  createPath: string;
};

export default async function NoticeManager({
  scope,
  generationId,
  canWrite,
  heading,
  description,
  emptyMessage,
  basePath,
  createPath,
}: NoticeManagerProps) {
  const cookieHeader = await readServerCookieHeader();
  const readOnlyMessage =
    scope === "global"
      ? "전체 공지 작성/수정/삭제는 회장만 가능합니다."
      : "공지 작성/수정/삭제는 회장, 부회장, 부장만 가능합니다.";
  const generationIdOrNull = scope === "generation" ? generationId ?? null : null;
  let notices: NoticeItem[] = [];

  if (scope === "generation") {
    if (generationIdOrNull) {
      notices = normalizeNotices(
        await listCachedGenerationNotices(generationIdOrNull, cookieHeader),
      );
    }
  } else {
    notices = normalizeNotices(await listCachedGlobalNotices(cookieHeader));
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Notices</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{heading}</h1>
        {canWrite ? (
          <Link
            href={createPath}
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            공지 추가
          </Link>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">{description}</p>

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {readOnlyMessage}
        </p>
      ) : null}

      {notices.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {notices.map((notice) => (
            <li key={notice.id}>
              <Link
                href={`${basePath}/${notice.id}`}
                className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-slate-900">{notice.title}</p>
                  <span className="text-xs font-semibold text-slate-500">상세 보기</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {buildNoticePreview(notice.content)}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  작성자: {notice.author.name} ({buildRoleLabel(notice.author.role)}) · 작성일:{" "}
                  {formatKoreanDate(notice.createdAt)}
                  {notice.updatedAt !== notice.createdAt
                    ? ` · 수정일: ${formatKoreanDate(notice.updatedAt)}`
                    : ""}
                  {` · 최근 수정자: ${formatAuditActor(notice.updatedBy)}`}
                  {notice.imageUrls.length > 0 ? ` · 첨부 이미지 ${notice.imageUrls.length}장` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
