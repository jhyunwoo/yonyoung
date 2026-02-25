import type { ApiGeneration } from "./admin-api/types";
import { getAccessibleGenerations } from "./admin-generation";
import { fetchGenerationsFromServer, readServerCookieHeader } from "./admin-generation-server";
import { serverAuthTool } from "./auth-server-tool";
import type { AuthSession } from "./auth-shared";
import {
  buildDashboardGenerationPath,
  isSameGenerationRouteName,
} from "./dashboard-generation-route";

export type DashboardGenerationOption = Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate"
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
    "id" | "name" | "sortOrder" | "startDate" | "endDate"
  >,
): DashboardGenerationOption => ({
  id: generation.id,
  name: generation.name,
  sortOrder: generation.sortOrder,
  startDate: generation.startDate,
  endDate: generation.endDate,
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
