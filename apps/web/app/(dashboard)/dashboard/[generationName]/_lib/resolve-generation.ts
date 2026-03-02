import { redirect } from "next/navigation";
import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import {
  getAccessibleDashboardGenerationOptions,
  resolveGenerationOptionFromRouteName,
  type DashboardGenerationOption,
} from "@/features/dashboard/generation/dashboard-generation-server";

type GenerationRouteParams = Promise<{ generationName: string }>;

export const requireDashboardGeneration = async (
  params: GenerationRouteParams,
): Promise<DashboardGenerationOption> => {
  const { generationName } = await params;
  const session = await serverAuthTool.requireSession();
  const generationOptions = await getAccessibleDashboardGenerationOptions(session);
  const generation = resolveGenerationOptionFromRouteName(generationOptions, generationName);

  if (!generation) {
    redirect("/dashboard");
  }

  return generation;
};
