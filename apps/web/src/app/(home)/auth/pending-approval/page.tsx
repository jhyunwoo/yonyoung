import Link from "next/link";
import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import { canAccessAdminPage, hasCompletedRequiredProfile } from "../../../../lib/auth-shared";

export default async function PendingApprovalPage() {
  const session = await serverAuthTool.requireSession();
  const isProfileComplete = hasCompletedRequiredProfile(session.user);

  if (canAccessAdminPage(session)) {
    redirect(isProfileComplete ? "/admin" : "/auth/profile");
  }

  if (!isProfileComplete) {
    redirect("/auth/profile");
  }

  return (
    <section className="px-4 pb-18 pt-14 md:px-6 md:pt-20" data-testid="auth-pending-approval-page">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-(--surface-border) bg-(--surface-elevated) p-7 shadow-[0_24px_60px_-42px_var(--shadow-strong)] md:p-10">
        <p className="text-xs uppercase tracking-[0.16em] text-(--text-muted)">Approval Pending</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-(--text-primary) md:text-5xl">
          기본 정보 입력이 완료되었습니다.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-(--text-secondary) md:text-base">
          관리자가 권한을 부여하기 전까지 기다려주세요. 권한이 부여되면 관리자 페이지에 접근할 수
          있습니다.
        </p>

        <div className="mt-8 rounded-2xl border border-(--surface-border) bg-(--surface-muted)/40 p-4 text-sm text-(--text-secondary)">
          계정: <span className="font-medium text-(--text-primary)">{session.user.email}</span>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full border border-(--surface-border) bg-(--surface-elevated) px-4 py-2 text-sm font-medium text-(--text-primary) transition hover:border-(--accent)"
          >
            홈으로 이동
          </Link>
          <Link
            href="/auth/pending-approval"
            className="inline-flex rounded-full bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-foreground) transition hover:opacity-90"
          >
            상태 새로고침
          </Link>
        </div>
      </div>
    </section>
  );
}
