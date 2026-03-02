import { serverAuthTool } from "@/features/auth/server/auth-guard";
import RecruitingPlanSettingsForm from "@/app/(dashboard)/dashboard/settings/recruiting/recruiting-plan-settings-form";

export default async function SettingsRecruitingPlanPage() {
  await serverAuthTool.requirePresidentAccess();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <RecruitingPlanSettingsForm />
    </main>
  );
}

