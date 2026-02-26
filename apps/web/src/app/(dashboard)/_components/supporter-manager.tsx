import Image from "next/image";
import Link from "next/link";
import { formatAuditActor } from "../../../lib/audit-display";
import { readServerCookieHeader } from "../../../lib/admin-generation-server";
import { listCachedSupporters } from "../../../lib/admin-dashboard-cache";
import { formatKoreanDate } from "../../../lib/date-formatters";
import { shouldUseUnoptimizedImage } from "../../../lib/image-utils";
import { sortSupportersByExpiresAt } from "./supporter-shared";

type SupporterManagerProps = {
  canWrite: boolean;
  basePath: string;
};

export default async function SupporterManager({
  canWrite,
  basePath,
}: SupporterManagerProps) {
  const cookieHeader = await readServerCookieHeader();
  const supporters = sortSupportersByExpiresAt(await listCachedSupporters(cookieHeader));

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Supporters</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">후원사 관리</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
        후원사 목록을 확인하고 항목을 클릭해 상세 정보를 조회할 수 있습니다.
      </p>

      {!canWrite ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          후원사 수정/삭제는 회장, 부회장, 부장만 가능합니다.
        </p>
      ) : null}

      {supporters.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          등록된 후원사가 없습니다.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="supporters-list">
          {supporters.map((supporter) => (
            <li key={supporter.id}>
              <Link
                href={`${basePath}/${supporter.id}`}
                className="block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                data-testid={`supporter-card-${supporter.id}`}
              >
                <div className="relative aspect-[3/2] w-full bg-slate-100">
                  <Image
                    src={supporter.logoUrl}
                    alt={supporter.name}
                    fill
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(supporter.logoUrl)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold text-slate-900">{supporter.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{supporter.link}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    만료일: {formatKoreanDate(supporter.expiresAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    최근 수정: {formatKoreanDate(supporter.updatedAt)} · {formatAuditActor(supporter.updatedBy)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
