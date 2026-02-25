"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import type { ApiGenerationNotice, ApiGlobalNotice } from "../../../../lib/admin-api/types";
import { formatKoreanDate } from "../../../../lib/date-formatters";

type GenerationNoticeOverviewProps = {
  generationId: string;
  generationPath: string;
};

const readNoticeAuthor = (notice: ApiGenerationNotice | ApiGlobalNotice): string =>
  notice.author.name;

export default function GenerationNoticeOverview({
  generationId,
  generationPath,
}: GenerationNoticeOverviewProps) {
  const [generationNotices, setGenerationNotices] = useState<ApiGenerationNotice[]>([]);
  const [globalNotices, setGlobalNotices] = useState<ApiGlobalNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [generationRows, globalRows] = await Promise.all([
          adminResourceApi.listGenerationNotices(generationId),
          adminResourceApi.listGlobalNotices(),
        ]);

        if (!isMounted) {
          return;
        }

        setGenerationNotices(generationRows.slice(0, 4));
        setGlobalNotices(globalRows.slice(0, 4));
      } catch {
        if (!isMounted) {
          return;
        }

        setGenerationNotices([]);
        setGlobalNotices([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [generationId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">공지</h2>
        <Link href={`${generationPath}/notices`} className="text-xs font-semibold text-slate-600 hover:text-slate-900">
          기수 공지 관리로 이동
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">공지 목록을 불러오는 중입니다...</p>
      ) : (
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
                    <p className="mt-1 text-xs text-slate-600">{notice.content}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {readNoticeAuthor(notice)} · {formatKoreanDate(notice.createdAt)}
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
                    <p className="mt-1 text-xs text-slate-600">{notice.content}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {readNoticeAuthor(notice)} · {formatKoreanDate(notice.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
