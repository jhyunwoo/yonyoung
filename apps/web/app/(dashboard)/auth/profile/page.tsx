import { redirect } from "next/navigation";
import {
  AUTH_PENDING_APPROVAL_PATH,
  DASHBOARD_PATH,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
} from "@/features/auth/model/auth-shared";
import { readEditableProfileData } from "@/features/auth/profile/read-editable-profile-data";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

export default async function AuthProfilePage() {
  const data = await readEditableProfileData();
  if (!data) {
    redirect("/auth/sign-in");
  }

  const { role, initialProfile, resolvedUserId } = data;
  const isProfileComplete = hasCompletedRequiredProfile(initialProfile);
  const unverifiedRole = isUnverifiedRole(role);

  if (unverifiedRole && isProfileComplete) {
    redirect(AUTH_PENDING_APPROVAL_PATH);
  }

  if (!unverifiedRole && isProfileComplete) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <AuthProfileForm
      userId={resolvedUserId}
      role={role}
      mode="auth"
      initialProfile={initialProfile}
    />
  );
}
