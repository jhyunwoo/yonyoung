import { redirect } from "next/navigation";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { toEditableUserProfile } from "@/features/dashboard/members/user-profile";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

const readDashboardProfileData = async () => {
  const session = await serverAuthGuard.getSession();
  if (!session) {
    return null;
  }

  const profile = await serverAuthGuard.getCurrentUserProfile(session);

  return {
    session,
    profile,
  };
};

export default async function DashboardProfilePage() {
  const data = await readDashboardProfileData();
  if (!data) {
    redirect("/auth/sign-in");
  }

  const { session, profile } = data;
  const profileLike = (profile ?? session.user) as Record<string, unknown>;
  const initialProfile = toEditableUserProfile(profileLike);
  const resolvedUserId =
    typeof profileLike.id === "string" && profileLike.id.trim().length > 0
      ? profileLike.id.trim()
      : session.user.id;

  return (
    <AuthProfileForm
      userId={resolvedUserId}
      role={session.user.role ?? null}
      mode="dashboard"
      initialProfile={initialProfile}
    />
  );
}
