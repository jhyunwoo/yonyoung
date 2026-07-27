import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import SiteSettingsForm from "@/app/(dashboard)/dashboard/settings/site/site-settings-form";
import AttachmentManager from "@/app/(dashboard)/_components/attachment-manager";

export default async function SettingsSitePage() {
  await serverAuthGuard.requirePresidentAccess();

  return (
    <div className="space-y-8 px-4 py-6 md:px-8 md:py-8">
      <SiteSettingsForm />

      {/* 후원 페이지에 공개되는 자료 (회계 내역, 월간연영회 PDF 등) */}
      <section className="mx-auto w-full max-w-4xl rounded-lg border border-hairline bg-surface p-6 md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted uppercase">
          Donate Files
        </p>
        <h2 className="mt-2 text-xl font-bold text-ink md:text-2xl">후원 페이지 자료</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          후원 페이지에 공개할 회계 자료나 월간연영회 PDF를 첨부할 수 있습니다. 방문자
          누구나 다운로드할 수 있습니다.
        </p>
        <div className="mt-6">
          <AttachmentManager scope="site_donate" />
        </div>
      </section>
    </div>
  );
}
