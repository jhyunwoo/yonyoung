import { serverAuthTool } from "../../../../lib/auth-server-tool";
import { toEditableUserProfile } from "../../../../lib/user-profile";
import AuthProfileForm from "../../auth/profile/profile-form";

export default async function DashboardProfilePage() {
  const session = await serverAuthTool.requireSession();
  const profile = await serverAuthTool.getCurrentUserProfile(session);
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
