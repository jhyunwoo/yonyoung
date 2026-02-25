import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import {
  AUTH_PENDING_APPROVAL_PATH,
  DASHBOARD_PATH,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
} from "../../../../lib/auth-shared";
import { toEditableUserProfile } from "../../../../lib/user-profile";
import AuthProfileForm from "./profile-form";

export default async function AuthProfilePage() {
  const session = await serverAuthTool.requireSession();
  const profile = await serverAuthTool.getCurrentUserProfile(session);
  const profileLike = (profile ?? session.user) as Record<string, unknown>;
  const isProfileComplete = hasCompletedRequiredProfile(profileLike);
  const unverifiedRole = isUnverifiedRole(session.user.role);

  if (unverifiedRole && isProfileComplete) {
    redirect(AUTH_PENDING_APPROVAL_PATH);
  }

  if (!unverifiedRole && isProfileComplete) {
    redirect(DASHBOARD_PATH);
  }

  const initialProfile = toEditableUserProfile(profileLike);

  return (
    <AuthProfileForm
      userId={session.user.id}
      role={session.user.role ?? null}
      mode="auth"
      initialProfile={initialProfile}
    />
  );
}
