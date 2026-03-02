import { redirect } from "next/navigation";
import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import { toEditableUserProfile } from "@/features/dashboard/members/user-profile";
import AuthProfileForm from "@/app/(dashboard)/auth/profile/profile-form";

const readDashboardProfileData = async () => {
  const session = await serverAuthTool.getSession();
  if (!session) {
    return null;
  }

  const profile = await serverAuthTool.getCurrentUserProfile(session);

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
  const initialProfile = toEditableUserProfile(profile ?? session.user);

  return (
    <AuthProfileForm
      userId={session.user.id}
      role={session.user.role ?? null}
      mode="dashboard"
      initialProfile={initialProfile}
    />
  );
}
