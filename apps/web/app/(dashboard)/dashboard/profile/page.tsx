import { redirect } from "next/navigation";
import { readEditableProfileData } from "@/features/auth/profile/read-editable-profile-data";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

export default async function DashboardProfilePage() {
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
