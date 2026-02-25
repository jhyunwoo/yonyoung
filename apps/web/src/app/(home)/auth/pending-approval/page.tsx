import Link from "next/link";
import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import { hasCompletedRequiredProfile, isUnverifiedRole } from "../../../../lib/auth-shared";

export default async function PendingApprovalPage() {
  const session = await serverAuthTool.requireSession();
  const profile = await serverAuthTool.getCurrentUserProfile(session);
  const profileLike = (profile ?? session.user) as Record<string, unknown>;
  const isProfileComplete = hasCompletedRequiredProfile(profileLike);

  if (!isUnverifiedRole(session.user.role)) {
    redirect(isProfileComplete ? "/dashboard" : "/auth/profile");
  }

  if (!isProfileComplete) {
    redirect("/auth/profile");
  }

  return (
    <section className="px-4 pb-16 pt-10 md:px-8 md:pb-20" data-testid="auth-pending-approval-page">
      <div className="mx-auto w-full max-w-[1200px] border border-(--surface-border) p-7 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--text-muted)">
          Approval Pending
        </p>
        <h1 className="mt-3 text-[2.2rem] leading-tight font-semibold text-(--text-primary) md:text-[2.8rem]">
          기본 정보 입력이 완료되었습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-muted) md:text-base">
          기본 정보 입력이 완료되었습니다. 관리자가 계정 권한을 변경하면 Dashboard에 접근할 수
          있습니다.
        </p>

        <div className="mt-8 border border-(--surface-border) bg-(--surface-muted) p-4 text-sm text-(--text-muted)">
          계정: <span className="font-medium text-(--text-primary)">{session.user.email}</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex border border-(--surface-strong-border) px-4 py-2 text-sm font-semibold text-(--text-primary) transition hover:bg-(--surface-muted)"
          >
            홈으로 이동
          </Link>
          <Link
            href="/auth/pending-approval"
            className="inline-flex border border-(--surface-strong-border) bg-(--text-primary) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            상태 새로고침
          </Link>
        </div>
      </div>
    </section>
  );
}
