import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import RecruitingPlanSettingsForm from "@/app/(dashboard)/dashboard/settings/recruiting/recruiting-plan-settings-form";
import AdminReadErrorNotice from "@/app/(dashboard)/_components/admin-read-error";
import { getAdminCurrentRecruitingPlan } from "@/features/dashboard/services/admin-read-service";

export default async function SettingsRecruitingPlanPage() {
  await serverAuthGuard.requirePresidentAccess();
  const planResult = await getAdminCurrentRecruitingPlan();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {planResult.ok ? (
        <RecruitingPlanSettingsForm initialPlan={planResult.data} />
      ) : (
        // 읽기 실패 시 빈 폼을 보여 주면 저장 한 번에 실제 모집 계획이 지워진다.
        <section
          className="mx-auto w-full max-w-6xl rounded-lg border border-hairline bg-surface p-6 md:p-8"
          data-testid="recruiting-plan-load-error"
        >
          <h1 className="text-2xl font-bold text-ink md:text-3xl">모집 계획</h1>
          <AdminReadErrorNotice error={planResult.error} />
          <p className="mt-3 text-sm text-ink-muted">
            현재 모집 계획을 불러오지 못해 편집을 막았습니다. 페이지를 새로고침해 다시
            시도해 주세요.
          </p>
        </section>
      )}
    </div>
  );
}
