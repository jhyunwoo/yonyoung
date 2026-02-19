"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AdminDrawerPanel = "create" | "edit";

type AdminDrawerQueryState = {
  panel: AdminDrawerPanel | null;
  id: string | null;
  isValid: boolean;
  isCanonical: boolean;
};

const parseDrawerQueryState = (
  searchParams: URLSearchParams,
): AdminDrawerQueryState => {
  const rawPanel = searchParams.get("panel");
  const rawId = searchParams.get("id");
  const id = rawId?.trim() ? rawId : null;

  if (rawPanel === null) {
    if (id !== null) {
      return {
        panel: null,
        id: null,
        isValid: false,
        isCanonical: false,
      };
    }

    return {
      panel: null,
      id: null,
      isValid: true,
      isCanonical: true,
    };
  }

  if (rawPanel === "create") {
    return {
      panel: "create",
      id: null,
      isValid: true,
      isCanonical: id === null,
    };
  }

  if (rawPanel === "edit") {
    if (id === null) {
      return {
        panel: null,
        id: null,
        isValid: false,
        isCanonical: false,
      };
    }

    return {
      panel: "edit",
      id,
      isValid: true,
      isCanonical: true,
    };
  }

  return {
    panel: null,
    id: null,
    isValid: false,
    isCanonical: false,
  };
};

const buildDrawerUrl = (
  pathname: string,
  searchParams: URLSearchParams,
  panel: AdminDrawerPanel | null,
  id: string | null,
): string => {
  const nextParams = new URLSearchParams(searchParams.toString());

  if (panel === "create") {
    nextParams.set("panel", "create");
    nextParams.delete("id");
  } else if (panel === "edit" && id) {
    nextParams.set("panel", "edit");
    nextParams.set("id", id);
  } else {
    nextParams.delete("panel");
    nextParams.delete("id");
  }

  const query = nextParams.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const useAdminDrawerQuerySync = () => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryState = useMemo(
    () => parseDrawerQueryState(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setDrawerQuery = useCallback(
    (panel: AdminDrawerPanel | null, id: string | null = null) => {
      const current = searchParams.toString();
      const currentUrl = current ? `${pathname}?${current}` : pathname;
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(current),
        panel,
        id,
      );

      if (nextUrl === currentUrl) {
        return;
      }

      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const normalizeDrawerQuery = useCallback(() => {
    if (!queryState.isValid) {
      setDrawerQuery(null, null);
      return;
    }

    if (!queryState.isCanonical) {
      setDrawerQuery(queryState.panel, queryState.id);
    }
  }, [queryState, setDrawerQuery]);

  return {
    queryState,
    setDrawerQuery,
    normalizeDrawerQuery,
  };
};
