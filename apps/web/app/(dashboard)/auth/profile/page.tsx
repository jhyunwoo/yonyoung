import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import {
  AUTH_PENDING_APPROVAL_PATH,
  DASHBOARD_PATH,
  hasCompletedRequiredProfile,
  isUnverifiedRole,
} from "@/features/auth/model/auth-shared";
import { toEditableUserProfile } from "@/features/dashboard/members/user-profile";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

const readAuthProfileData = async () => {
  const session = await serverAuthGuard.getSession();
  if (!session) {
    return null;
  }

  const profile = await serverAuthGuard.getCurrentUserProfile(session);

  return {
    session,
    profileLike: (profile ?? session.user) as Record<string, unknown>,
  };
};

export default async function AuthProfilePage() {
  const data = await readAuthProfileData();
  if (!data) {
    redirect("/auth/sign-in");
  }

  const { session, profileLike } = data;
  const isProfileComplete = hasCompletedRequiredProfile(profileLike);
  const unverifiedRole = isUnverifiedRole(session.user.role);

  if (unverifiedRole && isProfileComplete) {
    redirect(AUTH_PENDING_APPROVAL_PATH);
  }

  if (!unverifiedRole && isProfileComplete) {
    redirect(DASHBOARD_PATH);
  }

  const initialProfile = toEditableUserProfile(profileLike);
  const resolvedUserId =
    typeof profileLike.id === "string" && profileLike.id.trim().length > 0
      ? profileLike.id.trim()
      : session.user.id;

  return (
    <AuthProfileForm
      userId={resolvedUserId}
      role={session.user.role ?? null}
      mode="auth"
      initialProfile={initialProfile}
    />
  );
}
