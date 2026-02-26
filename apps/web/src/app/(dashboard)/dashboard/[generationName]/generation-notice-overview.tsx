import Link from "next/link";
import type { ApiGenerationNotice, ApiGlobalNotice } from "../../../../lib/admin-api/types";
import { readServerCookieHeader } from "../../../../lib/admin-generation-server";
import {
  listCachedGenerationNotices,
  listCachedGlobalNotices,
} from "../../../../lib/admin-dashboard-cache";
import { formatAuditActor } from "../../../../lib/audit-display";
import { formatKoreanDate } from "../../../../lib/date-formatters";
import { summarizeRichTextHtml } from "../../../../lib/rich-text";

type GenerationNoticeOverviewProps = {
  generationId: string;
  generationPath: string;
};

const readNoticeAuthor = (notice: ApiGenerationNotice | ApiGlobalNotice): string =>
  notice.author.name;

export default async function GenerationNoticeOverview({
  generationId,
  generationPath,
}: GenerationNoticeOverviewProps) {
  const cookieHeader = await readServerCookieHeader();
  const [generationRows, globalRows] = await Promise.all([
    listCachedGenerationNotices(generationId, cookieHeader),
    listCachedGlobalNotices(cookieHeader),
  ]);
  const generationNotices: ApiGenerationNotice[] = generationRows.slice(0, 4);
  const globalNotices: ApiGlobalNotice[] = globalRows.slice(0, 4);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">공지</h2>
        <Link href={`${generationPath}/notices`} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
          기수 공지 관리로 이동
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">기수 공지</p>
          {generationNotices.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              등록된 기수 공지가 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {generationNotices.map((notice) => (
                <li key={notice.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{notice.title}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {summarizeRichTextHtml(notice.content, 100)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {readNoticeAuthor(notice)} · {formatKoreanDate(notice.createdAt)} · 최근 수정자:{" "}
                    {formatAuditActor(notice.updatedBy)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">전체 공지</p>
          {globalNotices.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
              등록된 전체 공지가 없습니다.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {globalNotices.map((notice) => (
                <li key={notice.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{notice.title}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {summarizeRichTextHtml(notice.content, 100)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {readNoticeAuthor(notice)} · {formatKoreanDate(notice.createdAt)} · 최근 수정자:{" "}
                    {formatAuditActor(notice.updatedBy)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
