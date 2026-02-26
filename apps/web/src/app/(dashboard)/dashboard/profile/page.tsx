import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { serverAuthTool } from "../../../../lib/auth-server-tool";
import { toEditableUserProfile } from "../../../../lib/user-profile";
import AuthProfileForm from "../../auth/profile/profile-form";

const readDashboardProfileData = async () => {
  "use cache: private";
  cacheLife("minutes");

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
