"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ApiLinktree } from "../../../lib/admin-api/types";
import { adminResourceApi } from "../../../lib/admin-api/resources";
import { formatAuditActor } from "../../../lib/audit-display";
import { formatKoreanDate } from "../../../lib/date-formatters";
import { readLinktreeErrorMessage, sortLinktreesByName } from "./linktree-shared";

type LinktreeManagerProps = {
  canWrite: boolean;
  basePath: string;
};

export default function LinktreeManager({
  canWrite,
  basePath,
}: LinktreeManagerProps) {
  const [linktrees, setLinktrees] = useState<ApiLinktree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLinktrees = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = await adminResourceApi.listLinktrees();
      setLinktrees(sortLinktreesByName(rows));
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
      setLinktrees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLinktrees();
  }, [loadLinktrees]);

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Settings / Linktree</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">Linktree 관리</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        링크트리 분류와 분류별 링크를 확인할 수 있습니다. 항목을 클릭하면 상세 페이지로 이동합니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          링크트리 수정/삭제는 회장, 부회장, 부장만 가능합니다.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">링크트리 목록을 불러오는 중입니다...</p>
      ) : linktrees.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          등록된 링크트리 분류가 없습니다.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {linktrees.map((group) => (
            <li key={group.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`${basePath}/${group.id}`}
                    className="text-base font-semibold text-slate-900 transition hover:text-slate-700"
                  >
                    {group.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">분류 상세 보기</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  링크 {group.items.length}개
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                최근 수정: {formatKoreanDate(group.updatedAt)} · {formatAuditActor(group.updatedBy)}
              </p>

              {group.items.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  등록된 링크가 없습니다.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`${basePath}/${group.id}/items/${item.id}`}
                        className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <span className="ml-2 text-xs text-slate-500">상세 보기</span>
                        <span className="mt-1 block text-[11px] text-slate-400">
                          최근 수정: {formatKoreanDate(item.updatedAt)} · {formatAuditActor(item.updatedBy)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
