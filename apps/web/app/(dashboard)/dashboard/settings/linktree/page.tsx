import { Suspense } from "react";
import LinktreeManager from "@/app/(dashboard)/_components/linktree-manager";
import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import { isAdminRole } from "@/features/auth/model/auth-shared";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SettingsLinktreePage() {
  const session = await serverAuthTool.requireSession();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <Suspense
        fallback={
          <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="space-y-3" aria-hidden="true">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full max-w-lg" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`linktree-list-skeleton-${index + 1}`}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          </section>
        }
      >
        <LinktreeManager
          canWrite={isAdminRole(session.user.role)}
          basePath="/dashboard/settings/linktree"
        />
      </Suspense>
    </main>
  );
}
