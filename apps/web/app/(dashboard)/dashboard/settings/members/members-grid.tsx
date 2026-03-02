"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiUser } from "@/features/dashboard/api/admin-api/types";
import { AdminApiError } from "@/features/dashboard/api/admin-api/types";
import { adminResourceApi } from "@/features/dashboard/api/admin-api/resources";
import {
  buildMemberDisplayInitial,
  buildMemberDisplayName,
} from "@/features/dashboard/members/member-display-name";
import { Skeleton } from "@/components/ui/skeleton";

const readErrorMessage = (error: unknown): string => {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "전체 멤버 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
};

export default function MembersGrid() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const rows = await adminResourceApi.listUsers();
        if (!isMounted) {
          return;
        }
        setUsers(rows);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setUsers([]);
        setErrorMessage(readErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <li key={`settings-members-skeleton-${index + 1}`}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (errorMessage) {
    return (
      <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        등록된 멤버가 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {users.map((user) => {
        const displayName = buildMemberDisplayName(user);
        const avatarFallback = buildMemberDisplayInitial(displayName);

        return (
          <li key={user.id}>
            <Link
              href={`/dashboard/settings/members/${encodeURIComponent(user.id)}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={`${displayName} 프로필 이미지`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                      {avatarFallback}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user.studentNumber ?? "학번 미등록"}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p className="truncate">대학: {user.college?.trim() || "미등록"}</p>
                <p className="truncate">학과: {user.department?.trim() || "미등록"}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
