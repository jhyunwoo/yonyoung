import type { ApiGeneration } from "@yonyoung/contracts";
import { getAccessibleGenerations } from "@/features/dashboard/generation/generation-access";
import { fetchGenerationsFromServer } from "@/features/dashboard/generation/generation-fetcher";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import type { AuthSession } from "@/features/auth/model/auth-shared";
import {
  buildDashboardGenerationPath,
  isSameGenerationRouteName,
} from "@/features/dashboard/generation/dashboard-generation-route";
import { asRecord } from "@/shared/http/http";
import { trimToNull } from "@/shared/utils/trim-to-null";

export type DashboardGenerationOption = Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
> & {
  path: string;
};

const withCurrentUserUpdatedByFallback = (
  generation: Pick<
    ApiGeneration,
    "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
  >,
  currentUser: {
    id: string;
    name: string | null;
    familyName: string | null;
    givenName: string | null;
  },
): Pick<
  ApiGeneration,
  "id" | "name" | "sortOrder" | "startDate" | "endDate" | "updatedAt" | "updatedBy"
> => {
  if (!generation.updatedBy || generation.updatedBy.id !== currentUser.id) {
    return generation;
  }

  const resolvedName =
    trimToNull(generation.updatedBy.name) ??
    currentUser.name ??
    generation.updatedBy.name;

  return {
    ...generation,
    updatedBy: {
      ...generation.updatedBy,
      name: resolvedName,
      familyName: generation.updatedBy.familyName ?? currentUser.familyName,
      givenName: generation.updatedBy.givenName ?? currentUser.givenName,
    },
  };
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

  // 프로필 조회와 기수 목록 조회는 서로 독립 — 병렬로 실행해 왕복 시간을 줄인다
  const generationsPromise = fetchGenerationsFromServer();
  const profile = await profilePromise;
  const generations = await generationsPromise;
  const mergedUser = {
    ...session.user,
    ...(asRecord(profile) ?? {}),
  };
  const currentUserProfile = {
    id: session.user.id,
    name: trimToNull(mergedUser.name),
    familyName: trimToNull(mergedUser.familyName),
    givenName: trimToNull(mergedUser.givenName),
  };

  const accessibleGenerations = getAccessibleGenerations(
    {
      user: mergedUser,
    },
    generations,
  );

  return accessibleGenerations
    .map((generation) => withCurrentUserUpdatedByFallback(generation, currentUserProfile))
    .map(toGenerationOption);
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
