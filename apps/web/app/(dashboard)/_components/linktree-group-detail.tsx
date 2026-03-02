"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiLinktree } from "@/features/dashboard/api/admin-api/types";
import { AdminApiError } from "@/features/dashboard/api/admin-api/types";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { Skeleton } from "@/components/ui/skeleton";
import AuditHistoryPanel from "@/app/(dashboard)/_components/audit-history-panel";
import LastUpdatedMeta from "@/app/(dashboard)/_components/last-updated-meta";
import { readLinktreeErrorMessage } from "@/app/(dashboard)/_components/linktree-shared";

type LinktreeGroupDetailProps = {
  linktreeId: string;
  canWrite: boolean;
  listPath: string;
};

export default function LinktreeGroupDetail({
  linktreeId,
  canWrite,
  listPath,
}: LinktreeGroupDetailProps) {
  const router = useRouter();
  const [linktree, setLinktree] = useState<ApiLinktree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLinktree = useCallback(async () => {
    setIsLoading(true);
    setIsNotFound(false);
    setErrorMessage(null);

    try {
      const row = await adminResourceApi.getLinktreeById(linktreeId);
      setLinktree(row);
    } catch (error) {
      setLinktree(null);
      if (error instanceof AdminApiError && error.status === 404) {
        setIsNotFound(true);
      } else {
        setErrorMessage(readLinktreeErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [linktreeId]);

  useEffect(() => {
    void loadLinktree();
  }, [loadLinktree]);

  const handleDelete = async () => {
    const confirmed = window.confirm("이 분류를 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await adminResourceApi.deleteLinktree(linktreeId);
      router.replace(listPath);
      router.refresh();
    } catch (error) {
      setErrorMessage(readLinktreeErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <div className="rounded-xl border border-slate-200 p-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-3 h-3 w-28" />
            <Skeleton className="mt-1 h-3 w-36" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">링크 분류 상세</h1>
        <p className="mt-3 text-sm text-slate-600">존재하지 않는 분류이거나 접근할 수 없습니다.</p>
        <Link
          href={listPath}
          className="mt-6 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          목록으로 이동
        </Link>
      </section>
    );
  }

  if (!linktree) {
    return (
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm text-slate-500">분류 데이터를 불러올 수 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Settings / Linktree</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">링크 분류 상세</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        분류 정보와 하위 링크를 확인할 수 있고, 권한이 있으면 분류를 수정하거나 삭제할 수 있습니다.
      </p>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 p-4">
        <p className="text-xl font-semibold text-slate-900">{linktree.name}</p>
        <p className="mt-2 text-xs text-slate-500">링크 {linktree.items.length}개</p>
        <p className="mt-1 text-xs text-slate-500">생성일: {formatKoreanDate(linktree.createdAt)}</p>
        <LastUpdatedMeta
          updatedAt={linktree.updatedAt}
          updatedBy={linktree.updatedBy}
          className="mt-1 text-xs text-slate-500"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={listPath}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            목록으로
          </Link>

          {canWrite ? (
            <>
              <Link
                href={`${listPath}/${linktree.id}/edit`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                분류 수정
              </Link>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                분류 삭제
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-900">하위 링크</p>

        {linktree.items.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            등록된 링크가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {linktree.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`${listPath}/${linktree.id}/items/${item.id}`}
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
      </div>

      <div className="mt-6">
        <AuditHistoryPanel resourceType="linktree" resourceId={linktree.id} />
      </div>
    </section>
  );
}
