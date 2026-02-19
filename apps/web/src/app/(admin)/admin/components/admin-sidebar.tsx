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

type AdminTheme = "light" | "dark";
type SidebarIconName =
  | "profile"
  | "generations"
  | "activities"
  | "supporters"
  | "exhibitions"
  | "linktree"
  | "users";

const THEME_STORAGE_KEY = "theme";

const applyTheme = (theme: AdminTheme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

const RESOURCE_MENU_ITEMS = [
  {
    resourcePath: "activities",
    label: "활동 관리",
    shortLabel: "ACT",
    icon: "activities",
  },
  {
    resourcePath: "supporters",
    label: "후원사 관리",
    shortLabel: "SUP",
    icon: "supporters",
  },
  {
    resourcePath: "exhibitions",
    label: "전시 관리",
    shortLabel: "EXH",
    icon: "exhibitions",
  },
  {
    resourcePath: "linktree",
    label: "링크 모음 관리",
    shortLabel: "LNK",
    icon: "linktree",
  },
  {
    resourcePath: "users",
    label: "사용자 관리",
    shortLabel: "USR",
    icon: "users",
  },
] as const;

const NAV_ITEM_BASE_CLASS =
  "group relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200";

const NAV_ICON_CLASS = "h-4 w-4 shrink-0";

const NAV_ITEM_SCOPE_BADGE_CLASS =
  "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em]";

const SidebarIcon = ({
  name,
  className = NAV_ICON_CLASS,
}: {
  name: SidebarIconName;
  className?: string;
}) => {
  const iconProps = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "profile":
      return (
        <svg {...iconProps}>
          <path d="M18 20a6 6 0 0 0-12 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      );
    case "generations":
      return (
        <svg {...iconProps}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case "activities":
      return (
        <svg {...iconProps}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "supporters":
      return (
        <svg {...iconProps}>
          <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.62A4 4 0 0 1 19 11c0 5.65-7 10-7 10Z" />
        </svg>
      );
    case "exhibitions":
      return (
        <svg {...iconProps}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="m8 14 2.8-3.2a1 1 0 0 1 1.5-.05L16 15" />
          <circle cx="9" cy="9" r="1.1" />
        </svg>
      );
    case "linktree":
      return (
        <svg {...iconProps}>
          <path d="M10 7h5a3 3 0 1 1 0 6h-5" />
          <path d="M14 17H9a3 3 0 1 1 0-6h5" />
        </svg>
      );
    case "users":
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19a6 6 0 0 1 12 0" />
          <path d="M17 11a3 3 0 1 0 0-6" />
          <path d="M21 19a4.7 4.7 0 0 0-3.5-4.5" />
        </svg>
      );
    default:
      return null;
  }
};

const ROLE_LABEL_MAP = {
  president: "회장",
  vice_president: "부회장",
  manager: "운영진",
  regular_member: "정회원",
  associate_member: "준회원",
  new_member: "신입회원",
  unverified: "미인증",
  member: "회원",
} as const;

const getRoleLabelInKorean = (role: string | null | undefined): string => {
  if (!role) {
    return ROLE_LABEL_MAP.member;
  }

  if (role in ROLE_LABEL_MAP) {
    return ROLE_LABEL_MAP[role as keyof typeof ROLE_LABEL_MAP];
  }

  return role;
};

/**
 * isActiveResourcePath 조건을 평가해 사용 가능 여부를 판별합니다.
 * @param pathname 리소스 경로 또는 라우팅 경로 문자열입니다.
 * @param sortOrder 함수 로직에서 사용하는 입력값입니다.
 * @param resourcePath 응답 데이터 또는 응답 객체입니다.
 * @returns 조건 판별 결과(boolean)를 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
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

/**
 * AdminSidebar 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param { collapsed, onToggle, session } 인증/인가 상태를 포함한 세션 정보입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks 리렌더링 타이밍에 따라 훅 의존성 배열을 신중히 관리해야 합니다.
 */
export default function AdminSidebar({ collapsed, onToggle, session }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [generationList, setGenerationList] = useState<ApiGeneration[]>([]);
  const [isGenerationLoading, setIsGenerationLoading] = useState(true);
  const [theme, setTheme] = useState<AdminTheme>("light");
  const canManageGenerationsFlag = canManageGenerations(session);

  useEffect(/** useEffect 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
    let isMounted = true;

        /**
     * loadGenerations 외부 또는 내부 소스에서 데이터를 읽어오는 로직을 수행합니다.
     * @returns 외부 소스에서 읽어 온 결과를 Promise로 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
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
    return /** 반환 값 계산 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        setTheme(stored);
        applyTheme(stored);
        return;
      }
    } catch {
      // localStorage 접근 실패 시 DOM 상태를 기준으로 동기화한다.
    }

    const currentTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(currentTheme);
  }, []);

  const routeContext = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => extractGenerationRouteContext(pathname),
    [pathname],
  );

  const accessibleGenerations = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => getAccessibleGenerations(session, generationList),
    [session, generationList],
  );

  const currentGeneration =
    routeContext.sortOrder === null
      ? null
      : accessibleGenerations.find(
                    /**
           * accessibleGenerations.find 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
           * @param generation 함수 로직에서 사용하는 입력값입니다.
           * @returns 함수 실행 결과를 반환합니다.
           * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
           */
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

    /**
   * handleGenerationChange의 핵심 비즈니스 로직을 수행합니다.
   * @param nextSortOrderRaw 에러 상황을 나타내는 객체입니다.
   * @returns 함수 실행 결과를 반환합니다.
   * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
   */
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
  const isProfileActive =
    pathname === "/admin/profile" || pathname.startsWith("/admin/profile/");
  const generationScopeLabel =
    selectedSortOrder === null ? "기수" : `${selectedSortOrder}기`;
  const userDisplayName =
    session.user.nickname?.trim() ||
    session.user.name?.trim() ||
    session.user.email.split("@")[0] ||
    "USER";
  const userInitial = userDisplayName.slice(0, 1).toUpperCase();
  const userRoleLabel = getRoleLabelInKorean(session.user.role);

  const handleThemeToggle = () => {
    setTheme((previous) => {
      const next = previous === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  };

  return (
    <aside
      data-testid="admin-sidebar"
      className={`admin-sidebar-glass flex h-screen shrink-0 flex-col border-r border-gray-200 transition-[width] duration-300 ${
        collapsed ? "w-[5.5rem]" : "w-80"
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        <div
          className={`min-w-0 transition-all duration-200 ${
            collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
          }`}
        >
          <p className="truncate text-[11px] font-semibold tracking-[0.16em] text-gray-500">
            YONYOUNG
          </p>
          <p className="truncate text-sm font-semibold text-gray-800">Admin Console</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-white/70 text-gray-700 shadow-sm hover:bg-gray-100"
          data-testid="admin-sidebar-toggle"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          <span
            aria-hidden="true"
            className={`text-sm transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          >
            ❮
          </span>
        </button>
      </div>

      <div className="border-b border-gray-200 px-3 py-3">
        {collapsed ? (
          <div className="flex justify-center">
            <span
              className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-gray-300 bg-gray-100 px-2 text-xs font-semibold text-gray-700"
              title={selectedSortOrder === null ? "기수 미선택" : `${selectedSortOrder}기 선택`}
            >
              {selectedSortOrder === null ? "?" : selectedSortOrder}
            </span>
          </div>
        ) : (
          <label className="block text-xs font-medium text-gray-600">
            현재 작업 기수
            <select
              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white/70 px-3 py-2 text-sm text-gray-700 shadow-sm"
              value={selectedSortOrder ?? ""}
              onChange={/** 조건 분기 처리 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param event 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (event) => handleGenerationChange(event.target.value)}
              disabled={generationOptions.length === 0 || isGenerationLoading}
              data-testid="admin-generation-select"
            >
              {generationOptions.length === 0 ? (
                <option value="">선택 가능한 기수 없음</option>
              ) : (
                generationOptions.map(/** generationOptions.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param generation 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (generation) => (
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
        <div className="space-y-3">
          <section
            className="rounded-2xl border border-blue-200 bg-blue-50/70 p-2"
            data-testid="admin-nav-global-group"
          >
            {collapsed ? null : (
              <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.08em] text-blue-900/80">
                전체 기수 공통 관리
              </p>
            )}

            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/profile"
                  data-testid="admin-nav-profile"
                  className={`${NAV_ITEM_BASE_CLASS} ${
                    isProfileActive
                      ? "border-black bg-black text-white shadow-md shadow-black/20"
                      : "border-blue-200 text-blue-900 hover:bg-blue-100/70"
                  } ${collapsed ? "justify-center" : "justify-start"}`}
                  title="내 프로필"
                >
                  <SidebarIcon name="profile" />
                  {collapsed ? (
                    <span className="sr-only">내 프로필</span>
                  ) : (
                    <>
                      <span className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-blue-200 bg-blue-50/70 text-blue-900`}>
                        전체
                      </span>
                      <span className="ml-2">내 프로필</span>
                    </>
                  )}
                </Link>
              </li>

              {canManageGenerationsFlag ? (
                <li>
                  <Link
                    href="/admin/generations"
                    data-testid="admin-nav-generation-settings"
                    className={`${NAV_ITEM_BASE_CLASS} ${
                      isGenerationSettingsActive
                        ? "border-black bg-black text-white shadow-md shadow-black/20"
                        : "border-blue-200 text-blue-900 hover:bg-blue-100/70"
                    } ${collapsed ? "justify-center" : "justify-start"}`}
                    title="기수 설정"
                  >
                    <SidebarIcon name="generations" />
                    {collapsed ? (
                      <span className="sr-only">기수 설정</span>
                    ) : (
                      <>
                        <span className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-blue-200 bg-blue-50/70 text-blue-900`}>
                          전체
                        </span>
                        <span className="ml-2">기수 설정</span>
                      </>
                    )}
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>

          <section
            className="rounded-2xl border border-gray-200 bg-white p-2"
            data-testid="admin-nav-generation-group"
          >
            {collapsed ? null : (
              <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.08em] text-gray-500">
                선택 기수별 관리
              </p>
            )}

            <ul className="space-y-2">
              {RESOURCE_MENU_ITEMS.map(
                /** RESOURCE_MENU_ITEMS.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => {
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
                        className={`${NAV_ITEM_BASE_CLASS} ${
                          active
                            ? "border-black bg-black text-white shadow-md shadow-black/20"
                            : "border-gray-200 text-gray-700 hover:bg-gray-100"
                        } ${collapsed ? "justify-center" : "justify-start"}`}
                        title={item.label}
                      >
                        <SidebarIcon name={item.icon} />
                        {collapsed ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <>
                            <span className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-gray-300 bg-gray-100 text-gray-600`}>
                              {generationScopeLabel}
                            </span>
                            <span className="ml-2">{item.label}</span>
                          </>
                        )}
                      </Link>
                    </li>
                  );
                },
              )}
            </ul>
          </section>
        </div>

      </nav>

      <div className="space-y-2 border-t border-gray-200 p-3">
        {collapsed ? (
          <div className="flex justify-center" data-testid="admin-user-summary-collapsed">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700 shadow-sm"
              title={`${userDisplayName} (${session.user.email})`}
              aria-label={`${userDisplayName} 프로필`}
            >
              {userInitial}
            </div>
          </div>
        ) : (
          <section
            className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5"
            data-testid="admin-user-summary"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-700">{userDisplayName}</p>
                <p className="truncate text-xs text-gray-500">{session.user.email}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              권한: <span className="font-semibold text-gray-700">{userRoleLabel}</span>
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={handleThemeToggle}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white/70 px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 ${
            collapsed ? "w-11" : "w-full"
          }`}
          data-testid="admin-theme-toggle"
          aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          <span aria-hidden="true" className="text-base leading-none">
            {theme === "dark" ? "☀" : "☾"}
          </span>
          {collapsed ? null : (
            <span>{theme === "dark" ? "라이트 모드" : "다크 모드"}</span>
          )}
        </button>
        <LogoutButton compact={collapsed} />
      </div>
    </aside>
  );
}
