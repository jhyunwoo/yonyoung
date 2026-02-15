"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "../logout-button";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { buildGenerationPath, extractGenerationRouteContext, getAccessibleGenerations } from "../../../../lib/admin-generation";
import { canManageGenerations } from "../../../../lib/auth-shared";
import type { ApiGeneration } from "../../../../lib/admin-api/types";
import type { AuthSession } from "../../../../lib/auth-shared";

type AdminSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  session: AuthSession;
};

const RESOURCE_MENU_ITEMS = [
  { resourcePath: "activities", label: "Activities", shortLabel: "ACT" },
  { resourcePath: "supporters", label: "Supporters", shortLabel: "SUP" },
  { resourcePath: "exhibitions", label: "Exhibitions", shortLabel: "EXH" },
  { resourcePath: "linktree", label: "Linktree", shortLabel: "LNK" },
  { resourcePath: "users", label: "Users", shortLabel: "USR" },
] as const;

const isActiveResourcePath = (
  pathname: string,
  sortOrder: number | null,
  resourcePath: string,
): boolean => {
  if (sortOrder === null) {
    return false;
  }

  const itemPath = buildGenerationPath(sortOrder, resourcePath);
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

export default function AdminSidebar({ collapsed, onToggle, session }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [generationList, setGenerationList] = useState<ApiGeneration[]>([]);
  const [isGenerationLoading, setIsGenerationLoading] = useState(true);
  const canManageGenerationsFlag = canManageGenerations(session);

  useEffect(() => {
    let isMounted = true;

    const loadGenerations = async () => {
      setIsGenerationLoading(true);
      try {
        const data = await adminResourceApi.listGenerations();
        if (!isMounted) {
          return;
        }
        setGenerationList(data);
      } catch {
        if (!isMounted) {
          return;
        }
        setGenerationList([]);
      } finally {
        if (isMounted) {
          setIsGenerationLoading(false);
        }
      }
    };

    void loadGenerations();
    return () => {
      isMounted = false;
    };
  }, []);

  const routeContext = useMemo(
    () => extractGenerationRouteContext(pathname),
    [pathname],
  );

  const accessibleGenerations = useMemo(
    () => getAccessibleGenerations(session, generationList),
    [session, generationList],
  );

  const currentGeneration =
    routeContext.sortOrder === null
      ? null
      : accessibleGenerations.find(
          (generation) => generation.sortOrder === routeContext.sortOrder,
        ) ?? null;
  const fallbackRouteGeneration =
    routeContext.sortOrder === null
      ? []
      : [
          {
            id: `route-${routeContext.sortOrder}`,
            name: `Generation ${routeContext.sortOrder}`,
            sortOrder: routeContext.sortOrder,
          },
        ];
  const generationOptions =
    accessibleGenerations.length > 0
      ? accessibleGenerations
      : fallbackRouteGeneration;

  const selectedSortOrder =
    routeContext.sortOrder ??
    currentGeneration?.sortOrder ??
    generationOptions[0]?.sortOrder ??
    null;

  const handleGenerationChange = (nextSortOrderRaw: string) => {
    const nextSortOrder = Number.parseInt(nextSortOrderRaw, 10);
    if (!Number.isFinite(nextSortOrder)) {
      return;
    }

    const nextPath = buildGenerationPath(
      nextSortOrder,
      routeContext.sortOrder === null ? null : routeContext.resourcePath,
    );
    router.push(nextPath);
  };

  const isGenerationSettingsActive =
    pathname === "/admin/generations" || pathname.startsWith("/admin/generations/");

  return (
    <aside
      data-testid="admin-sidebar"
      className={`flex h-screen shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        <span
          className={`overflow-hidden whitespace-nowrap text-sm font-semibold text-gray-700 transition-opacity ${
            collapsed ? "opacity-0" : "opacity-100"
          }`}
        >
          Admin Console
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          data-testid="admin-sidebar-toggle"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      <div className="border-b border-gray-200 px-3 py-3">
        {collapsed ? (
          <p className="text-center text-xs font-medium text-gray-600">GEN</p>
        ) : (
          <label className="block text-xs font-medium text-gray-600">
            Generation
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700"
              value={selectedSortOrder ?? ""}
              onChange={(event) => handleGenerationChange(event.target.value)}
              disabled={generationOptions.length === 0 || isGenerationLoading}
              data-testid="admin-generation-select"
            >
              {generationOptions.length === 0 ? (
                <option value="">선택 가능한 기수 없음</option>
              ) : (
                generationOptions.map((generation) => (
                  <option key={generation.id} value={generation.sortOrder}>
                    {generation.sortOrder}기 ({generation.name})
                  </option>
                ))
              )}
            </select>
          </label>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3" data-testid="admin-sidebar-nav">
        <ul className="space-y-2">
          {canManageGenerationsFlag ? (
            <li>
              <Link
                href="/admin/generations"
                data-testid="admin-nav-generation-settings"
                className={`flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  isGenerationSettingsActive
                    ? "border-black bg-black text-white"
                    : "border-gray-200 text-gray-700 hover:bg-gray-100"
                } ${collapsed ? "justify-center" : "justify-start"}`}
              >
                {collapsed ? "GEN" : "Generation Settings"}
              </Link>
            </li>
          ) : null}

          {RESOURCE_MENU_ITEMS.map((item) => {
            const href =
              selectedSortOrder === null
                ? "/admin"
                : buildGenerationPath(selectedSortOrder, item.resourcePath);
            const active = isActiveResourcePath(
              pathname,
              selectedSortOrder,
              item.resourcePath,
            );

            return (
              <li key={item.resourcePath}>
                <Link
                  href={href}
                  data-testid={`admin-nav-${item.shortLabel.toLowerCase()}`}
                  className={`flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100"
                  } ${collapsed ? "justify-center" : "justify-start"}`}
                >
                  {collapsed ? item.shortLabel : item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-3">
        <LogoutButton compact={collapsed} />
      </div>
    </aside>
  );
}
