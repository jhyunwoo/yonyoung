import { serverAuthTool } from "../../../../../lib/auth-server-tool";
import SiteSettingsForm from "./site-settings-form";

export default async function SettingsSitePage() {
  await serverAuthTool.requirePresidentAccess();

  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <SiteSettingsForm />
    </main>
  );
}
