"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ApiActivity } from "../../../../../../lib/admin-api/types";
import { adminResourceApi } from "../../../../../../lib/admin-api/resources";
import { formatAuditActor } from "../../../../../../lib/audit-display";
import { formatKoreanDate, formatKoreanDateRange } from "../../../../../../lib/date-formatters";
import { shouldUseUnoptimizedImage } from "../../../../../../lib/image-utils";
import {
  readActivityErrorMessage,
  sortActivitiesByStartDateDesc,
  summarizeActivityDescription,
} from "./activity-shared";

type GenerationActivitiesListProps = {
  generationId: string;
  generationPath: string;
  generationName: string;
  canManage: boolean;
};

export default function GenerationActivitiesList({
  generationId,
  generationPath,
  generationName,
  canManage,
}: GenerationActivitiesListProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const rows = await adminResourceApi.listActivities();
      const filtered = rows.filter((activity) => activity.generationId === generationId);
      setActivities(sortActivitiesByStartDateDesc(filtered));
    } catch (error) {
      setErrorMessage(readActivityErrorMessage(error));
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [generationId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  return (
    <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Activities</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">
            {generationName} 활동 관리
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            현재 기수의 활동을 확인하고 필요한 경우 새 활동을 추가할 수 있습니다.
          </p>
        </div>
        {canManage ? (
          <Link
            href={`${generationPath}/activities/new`}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            활동 추가
          </Link>
        ) : null}
      </div>

      {!canManage ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          활동 생성/수정 권한이 없습니다.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">활동 목록을 불러오는 중입니다...</p>
      ) : activities.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          현재 기수에 등록된 활동이 없습니다.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="generation-activities-list">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Link
                href={`${generationPath}/activities/${activity.id}`}
                className="block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                data-testid={`generation-activity-card-${activity.id}`}
              >
                <div className="relative aspect-[4/3] w-full bg-slate-100">
                  <Image
                    src={activity.coverImageUrl}
                    alt={activity.title}
                    fill
                    className="object-cover"
                    unoptimized={shouldUseUnoptimizedImage(activity.coverImageUrl)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-base font-semibold text-slate-900">{activity.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatKoreanDateRange(activity.startDate, activity.endDate)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {summarizeActivityDescription(activity.description)}
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    최근 수정: {formatKoreanDate(activity.updatedAt)} · {formatAuditActor(activity.updatedBy)}
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
