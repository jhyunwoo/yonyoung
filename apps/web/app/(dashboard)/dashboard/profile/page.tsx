import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { readEditableProfileData } from "@/features/auth/profile/read-editable-profile-data";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

export default async function DashboardProfilePage() {
  await serverAuthGuard.requireAdminPageAccess();
  const data = await readEditableProfileData();
  if (!data) {
    redirect("/auth/sign-in");
  }

  const { role, initialProfile, resolvedUserId } = data;

  return (
    <AuthProfileForm
      userId={resolvedUserId}
      role={role}
      mode="dashboard"
      initialProfile={initialProfile}
    />
  );
}
