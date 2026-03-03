import type { ApiGeneration } from "@/shared/contracts/api-contracts";
import { getAccessibleGenerations } from "@/features/dashboard/generation/generation-access";
import { fetchGenerationsFromServer } from "@/features/dashboard/generation/generation-fetcher";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import type { AuthSession } from "@/features/auth/model/auth-shared";
import {
  buildDashboardGenerationPath,
  isSameGenerationRouteName,
} from "@/features/dashboard/generation/dashboard-generation-route";
import { asRecord } from "@/shared/http/http";

export type DashboardGenerationOption = Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
> & {
  path: string;
};

const toGenerationOption = (
  generation: Pick<
    ApiGeneration,
    "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
  >,
): DashboardGenerationOption => ({
  id: generation.id,
  name: generation.name,
  sortOrder: generation.sortOrder,
  startDate: generation.startDate,
  endDate: generation.endDate,
  updatedAt: generation.updatedAt,
  updatedBy: generation.updatedBy,
  path: buildDashboardGenerationPath(generation),
});

export const getAccessibleDashboardGenerationOptions = async (
  session: AuthSession,
  options?: {
    profile?: Record<string, unknown> | null;
  },
): Promise<DashboardGenerationOption[]> => {
  const profilePromise =
    options?.profile !== undefined
      ? Promise.resolve(options.profile)
      : serverAuthGuard.getCurrentUserProfile(session);

  let profile = await profilePromise;
  if (!profile && options?.profile === undefined) {
    profile = await serverAuthGuard.getCurrentUserProfile(session);
  }
  const generations = await fetchGenerationsFromServer();
  const mergedUser = {
    ...session.user,
    ...(asRecord(profile) ?? {}),
  };

  const accessibleGenerations = getAccessibleGenerations(
    {
      user: mergedUser,
    },
    generations,
  );

  return accessibleGenerations.map(toGenerationOption);
};

export const resolveGenerationOptionFromRouteName = (
  options: readonly DashboardGenerationOption[],
  generationRouteName: string,
): DashboardGenerationOption | null => {
  return (
    options.find((option) =>
      isSameGenerationRouteName(option.name, generationRouteName),
    ) ?? null
  );
};
