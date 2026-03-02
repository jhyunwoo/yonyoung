import type { ApiGeneration } from "@/features/dashboard/api/admin-api/types";
import { getAccessibleGenerations } from "@/features/dashboard/generation/admin-generation";
import { fetchGenerationsFromServer, readServerCookieHeader } from "@/features/dashboard/generation/admin-generation-server";
import { serverAuthTool } from "@/features/auth/server/auth-server-tool";
import type { AuthSession } from "@/features/auth/model/auth-shared";
import {
  buildDashboardGenerationPath,
  isSameGenerationRouteName,
} from "@/features/dashboard/generation/dashboard-generation-route";

export type DashboardGenerationOption = Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
> & {
  path: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
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
      : serverAuthTool.getCurrentUserProfile(session);

  const [cookieHeader, profile] = await Promise.all([
    readServerCookieHeader(),
    profilePromise,
  ]);

  const generations = await fetchGenerationsFromServer(cookieHeader);
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
