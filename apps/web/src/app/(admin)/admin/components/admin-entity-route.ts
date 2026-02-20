export type AdminEntityRouteMode = "list" | "create" | "detail" | "edit";

export const normalizeAdminBasePath = (basePath: string): string =>
  basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

export const buildAdminEntityRoute = (
  basePath: string,
  mode: AdminEntityRouteMode,
  id?: string | null,
): string => {
  const normalizedBasePath = normalizeAdminBasePath(basePath);

  if (mode === "list") {
    return normalizedBasePath;
  }

  if (mode === "create") {
    return `${normalizedBasePath}/create`;
  }

  if (!id) {
    return normalizedBasePath;
  }

  if (mode === "detail") {
    return `${normalizedBasePath}/${id}`;
  }

  return `${normalizedBasePath}/${id}/edit`;
};
