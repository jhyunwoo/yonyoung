import { isPresidentRole } from "./auth-shared";
import type { ApiGeneration } from "./admin-api/types";

type GenerationLike = Pick<ApiGeneration, "id" | "name" | "sortOrder">;
type SessionWithGenerationRole =
  | {
      user?: Record<string, unknown> | null;
    }
  | null
  | undefined;

const sortBySortOrder = <T extends GenerationLike>(generations: T[]): T[] => {
  return [...generations].sort((a, b) => {
    if (a.sortOrder === b.sortOrder) {
      return a.name.localeCompare(b.name);
    }
    return a.sortOrder - b.sortOrder;
  });
};

const parseSortOrder = (value: string | number): number | null => {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getAccessibleGenerations = <T extends GenerationLike>(
  session: SessionWithGenerationRole,
  generations: T[],
): T[] => {
  const user = session?.user;
  if (!user || typeof user !== "object") {
    return [];
  }

  const sorted = sortBySortOrder(generations);
  const role = user.role;
  if (isPresidentRole(role)) {
    return sorted;
  }

  const ownGenerationId =
    typeof user.generationId === "string" ? user.generationId : null;
  if (!ownGenerationId) {
    return [];
  }

  return sorted.filter((generation) => generation.id === ownGenerationId);
};

export const resolveGenerationBySortOrder = <T extends GenerationLike>(
  generations: T[],
  sortOrderParam: string | number,
): T | null => {
  const sortOrder = parseSortOrder(sortOrderParam);
  if (sortOrder === null) {
    return null;
  }

  return (
    generations.find((generation) => generation.sortOrder === sortOrder) ?? null
  );
};

export const buildGenerationPath = (
  sortOrder: number | string,
  resourcePath?: string | null,
): string => {
  const normalizedSortOrder = String(sortOrder).trim();
  if (!resourcePath) {
    return `/admin/${normalizedSortOrder}`;
  }

  const normalizedResourcePath = resourcePath.replace(/^\/+/, "");
  if (!normalizedResourcePath) {
    return `/admin/${normalizedSortOrder}`;
  }

  return `/admin/${normalizedSortOrder}/${normalizedResourcePath}`;
};

export const extractGenerationRouteContext = (
  pathname: string,
): {
  sortOrder: number | null;
  resourcePath: string | null;
} => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin" || parts.length < 2) {
    return {
      sortOrder: null,
      resourcePath: null,
    };
  }

  const parsedSortOrder = parseSortOrder(parts[1] ?? "");
  if (parsedSortOrder === null) {
    return {
      sortOrder: null,
      resourcePath: null,
    };
  }

  const resourcePath = parts.slice(2).join("/");
  return {
    sortOrder: parsedSortOrder,
    resourcePath: resourcePath.length > 0 ? resourcePath : null,
  };
};
