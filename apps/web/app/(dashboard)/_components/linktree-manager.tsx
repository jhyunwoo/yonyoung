import Link from "next/link";
import { formatAuditActor } from "@/features/dashboard/ui/audit-display";
import { readServerCookieHeader } from "@/features/dashboard/generation/admin-generation-server";
import { listCachedLinktrees } from "@/features/dashboard/cache/admin-dashboard-cache";
import { formatKoreanDate } from "@/shared/utils/date-formatters";
import { sortLinktreesByName } from "@/app/(dashboard)/_components/linktree-shared";

type LinktreeManagerProps = {
  canWrite: boolean;
  basePath: string;
};

export default async function LinktreeManager({
  canWrite,
  basePath,
}: LinktreeManagerProps) {
  const cookieHeader = await readServerCookieHeader();
  const linktrees = sortLinktreesByName(await listCachedLinktrees(cookieHeader));

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Settings / Linktree</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">링크 모음 관리</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        링크 분류와 분류별 링크를 확인할 수 있습니다. 항목을 누르면 자세한 화면으로 이동합니다.
      </p>

      {canWrite ? (
        <Link
          href={`${basePath}/new`}
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          링크 모음 추가
        </Link>
      ) : null}

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          링크 모음을 수정하거나 삭제할 수 있는 권한이 없습니다.
        </p>
      ) : null}

      {linktrees.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          등록된 링크 분류가 없습니다.
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
