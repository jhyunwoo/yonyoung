"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  GalleryHorizontalEnd,
  Handshake,
  Layers3,
  Link2,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  Sun,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import AdminActionButton from "./admin-action-button";
import { AdminSelect } from "./admin-form-controls";
import LogoutButton from "../logout-button";
import { adminResourceApi } from "../../../../lib/admin-api/resources";
import { buildGenerationPath, extractGenerationRouteContext, getAccessibleGenerations } from "../../../../lib/admin-generation";
import { canManageGenerations, canManageGlobalUsers } from "../../../../lib/auth-shared";
import { formatKoreanName } from "../../../../lib/user-name";
import type { ApiGeneration } from "../../../../lib/admin-api/types";
import type { AuthSession } from "../../../../lib/auth-shared";

type AdminSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  session: AuthSession;
  variant?: "desktop" | "mobile";
};

type AdminThemeMode = "light" | "dark" | "system";
type SidebarIconName =
  | "profile"
  | "generations"
  | "activities"
  | "supporters"
  | "exhibitions"
  | "linktree"
  | "users";

const THEME_STORAGE_KEY = "theme";

const isAdminThemeMode = (value: string | null): value is AdminThemeMode =>
  value === "light" || value === "dark" || value === "system";

const resolveTheme = (mode: AdminThemeMode): "light" | "dark" => {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyThemeMode = (mode: AdminThemeMode, persist = true) => {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  if (persist) {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
};

const RESOURCE_MENU_ITEMS = [
  {
    resourcePath: "activities",
    label: "활동 관리",
    shortLabel: "ACT",
    icon: "activities",
  },
  {
    resourcePath: "exhibitions",
    label: "전시 관리",
    shortLabel: "EXH",
    icon: "exhibitions",
  },
  {
    resourcePath: "users",
    label: "기수 사용자 관리",
    shortLabel: "USR",
    icon: "users",
  },
] as const;

const GLOBAL_RESOURCE_MENU_ITEMS = [
  {
    href: "/admin/supporters",
    label: "서포터즈 관리",
    shortLabel: "SUP",
    icon: "supporters",
    testId: "admin-nav-sup",
  },
  {
    href: "/admin/linktree",
    label: "Linktree 관리",
    shortLabel: "LNK",
    icon: "linktree",
    testId: "admin-nav-lnk",
  },
] as const;

const NAV_ITEM_BASE_CLASS =
  "group relative flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out";

const NAV_ICON_CLASS = "h-[1.05rem] w-[1.05rem] shrink-0";
const NAV_ICON_WRAPPER_CLASS =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200";

const NAV_ITEM_SCOPE_BADGE_CLASS =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em]";

type NavItemTone = "global" | "generation";

const getNavItemClassName = ({
  active,
  collapsed,
  tone,
}: {
  active: boolean;
  collapsed: boolean;
  tone: NavItemTone;
}): string => {
  const inactiveClassName =
    tone === "global"
      ? "border-[var(--admin-global-border)] bg-[var(--admin-global-surface)] text-[var(--admin-global-text)] hover:-translate-y-px hover:bg-[var(--admin-global-hover)]"
      : "border-gray-200 bg-white/90 text-gray-700 hover:-translate-y-px hover:bg-white";

  const activeClassName =
    "border-[var(--admin-accent-strong)] bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)] shadow-lg shadow-black/25 hover:translate-y-0";

  return [
    NAV_ITEM_BASE_CLASS,
    active ? activeClassName : inactiveClassName,
    collapsed ? "justify-center px-2.5" : "justify-start",
  ].join(" ");
};

const getNavIconWrapperClassName = ({
  active,
  tone,
}: {
  active: boolean;
  tone: NavItemTone;
}): string => {
  if (active) {
    return `${NAV_ICON_WRAPPER_CLASS} border-[var(--admin-accent-strong)] bg-[var(--admin-accent)] text-[var(--admin-accent-contrast)]`;
  }

  if (tone === "global") {
    return `${NAV_ICON_WRAPPER_CLASS} border-[var(--admin-global-border)] bg-white/80 text-[var(--admin-global-text)]`;
  }

  return `${NAV_ICON_WRAPPER_CLASS} border-gray-200 bg-gray-50 text-gray-600`;
};

const SidebarIcon = ({
  name,
  className = NAV_ICON_CLASS,
}: {
  name: SidebarIconName;
  className?: string;
}) => {
  const iconMap: Record<SidebarIconName, LucideIcon> = {
    profile: UserRound,
    generations: Layers3,
    activities: CalendarRange,
    supporters: Handshake,
    exhibitions: GalleryHorizontalEnd,
    linktree: Link2,
    users: UsersRound,
  };

  const IconComponent = iconMap[name];
  return <IconComponent className={className} strokeWidth={1.9} aria-hidden="true" />;
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
export default function AdminSidebar({
  collapsed,
  onToggle,
  session,
  variant = "desktop",
}: AdminSidebarProps) {
  const isMobileVariant = variant === "mobile";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generationList, setGenerationList] = useState<ApiGeneration[]>([]);
  const [isGenerationLoading, setIsGenerationLoading] = useState(true);
  const [themeMode, setThemeMode] = useState<AdminThemeMode>("system");
  const canManageGenerationsFlag = canManageGenerations(session);
  const canManageGlobalUsersFlag = canManageGlobalUsers(session);

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
      const fromDataset = document.documentElement.dataset.themeMode ?? null;
      const initialMode: AdminThemeMode = isAdminThemeMode(stored)
        ? stored
        : isAdminThemeMode(fromDataset)
        ? fromDataset
        : "system";

      setThemeMode(initialMode);
      applyThemeMode(initialMode, false);
      return;
    } catch {
      // localStorage 접근 실패 시 DOM 상태를 기준으로 동기화한다.
    }

    const fallbackMode = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setThemeMode(fallbackMode);
    applyThemeMode(fallbackMode, false);
  }, []);

  useEffect(() => {
    if (themeMode !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyThemeMode("system", false);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [themeMode]);

  const routeContext = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => extractGenerationRouteContext(pathname),
    [pathname],
  );

  const queryGenerationSortOrder = useMemo(() => {
    if (pathname !== "/admin") {
      return null;
    }

    const raw = searchParams.get("generation");
    if (!raw) {
      return null;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [pathname, searchParams]);

  const accessibleGenerations = useMemo(
        /**
     * useMemo 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다.
     * @returns 함수 실행 결과를 반환합니다.
     * @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다.
     */
    () => getAccessibleGenerations(session, generationList),
    [session, generationList],
  );

  const resolvedSortOrderFromRoute = routeContext.sortOrder ?? queryGenerationSortOrder;

  const currentGeneration =
    resolvedSortOrderFromRoute === null
      ? null
      : accessibleGenerations.find(
          (generation) => generation.sortOrder === resolvedSortOrderFromRoute,
        ) ?? null;
  const fallbackRouteGeneration =
    resolvedSortOrderFromRoute === null
      ? []
      : [
          {
            id: `route-${resolvedSortOrderFromRoute}`,
            name: `Generation ${resolvedSortOrderFromRoute}`,
            sortOrder: resolvedSortOrderFromRoute,
          },
        ];
  const generationOptions =
    accessibleGenerations.length > 0
      ? accessibleGenerations
      : fallbackRouteGeneration;

  const selectedSortOrder =
    resolvedSortOrderFromRoute ?? currentGeneration?.sortOrder ?? generationOptions[0]?.sortOrder ?? null;

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

    const nextPath =
      pathname === "/admin"
        ? `/admin?generation=${nextSortOrder}`
        : buildGenerationPath(
            nextSortOrder,
            routeContext.sortOrder === null ? null : routeContext.resourcePath,
          );
    router.push(nextPath);
  };

  const isGenerationSettingsActive =
    pathname === "/admin/generations" || pathname.startsWith("/admin/generations/");
  const isGlobalUsersActive =
    pathname === "/admin/users" || pathname.startsWith("/admin/users/");
  const isGlobalSupportersActive =
    pathname === "/admin/supporters" || pathname.startsWith("/admin/supporters/");
  const isGlobalLinktreeActive =
    pathname === "/admin/linktree" || pathname.startsWith("/admin/linktree/");
  const isProfileActive =
    pathname === "/admin/profile" || pathname.startsWith("/admin/profile/");
  const generationScopeLabel =
    selectedSortOrder === null ? "기수" : `${selectedSortOrder}기`;
  const userDisplayName = formatKoreanName({
    familyName: session.user.familyName,
    givenName: session.user.givenName,
    email: session.user.email,
  });
  const userInitial = userDisplayName.slice(0, 1).toUpperCase();
  const userRoleLabel = getRoleLabelInKorean(session.user.role);

  const handleThemeModeChange = (nextModeRaw: string) => {
    if (!isAdminThemeMode(nextModeRaw)) {
      return;
    }
    setThemeMode(nextModeRaw);
    applyThemeMode(nextModeRaw);
  };

  const sidebarWidthClass = isMobileVariant
    ? "w-[min(21rem,92vw)]"
    : collapsed
    ? "w-[4.875rem] md:w-[5.5rem]"
    : "w-[min(21rem,100vw)] md:w-[21.5rem]";

  const toggleLabel = isMobileVariant
    ? "사이드바 닫기"
    : collapsed
    ? "사이드바 펼치기"
    : "사이드바 접기";

  return (
    <aside
      data-testid="admin-sidebar"
      className={`admin-sidebar-modern admin-sidebar-glass flex h-screen shrink-0 flex-col border-r border-gray-200/80 transition-[width] duration-300 ${
        sidebarWidthClass
      }`}
    >
      <div className="relative z-10 flex h-full flex-col">
        <header className="border-b border-gray-200/80 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex min-w-0 items-center gap-2.5 transition-all duration-200 ${
                collapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white/90 text-base font-bold text-gray-700 shadow-sm">
                Y
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold tracking-[0.2em] text-gray-500">
                  YONYOUNG
                </p>
                <p className="truncate text-sm font-semibold text-gray-700">
                  Admin Workspace
                </p>
              </div>
            </div>
            <AdminActionButton
              variant="secondary"
              size="sm"
              iconOnly
              onClick={onToggle}
              data-testid="admin-sidebar-toggle"
              title={toggleLabel}
              aria-label={toggleLabel}
            >
              {isMobileVariant ? (
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              ) : collapsed ? (
                <PanelRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              ) : (
                <PanelLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              )}
            </AdminActionButton>
          </div>
        </header>

        <div className="border-b border-gray-200/80 px-3 py-3">
          {collapsed ? (
            <div className="flex justify-center">
              <span
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-2 text-xs font-semibold text-gray-700 shadow-sm"
                title={
                  selectedSortOrder === null
                    ? "작업 기수 미선택"
                    : `${selectedSortOrder}기 선택`
                }
              >
                {selectedSortOrder === null ? "?" : selectedSortOrder}
              </span>
            </div>
          ) : (
            <section className="rounded-2xl border border-gray-200 bg-white/90 p-3">
              <label className="block text-xs font-semibold tracking-[0.08em] text-gray-500">
                현재 작업 기수
                <AdminSelect
                  className="mt-2 text-[var(--admin-text-secondary)]"
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
                </AdminSelect>
              </label>
              <p className="mt-2 text-[11px] text-gray-500">
                접근 가능 기수 {generationOptions.length}개
              </p>
            </section>
          )}
        </div>

        <nav
          className="admin-sidebar-scroll flex-1 overflow-y-auto px-3 py-4"
          data-testid="admin-sidebar-nav"
        >
          <div className="space-y-4">
            <section
              className="rounded-3xl border border-[var(--admin-global-border)] bg-[var(--admin-global-surface)] p-2.5"
              data-testid="admin-nav-global-group"
            >
              {collapsed ? null : (
                <div className="flex items-center justify-between px-2 pb-2">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--admin-global-text)]">
                    전역 관리
                  </p>
                  <span className="rounded-full border border-[var(--admin-global-border)] bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-[var(--admin-global-text)]">
                    ALL
                  </span>
                </div>
              )}

              <ul className="space-y-2">
                <li>
                  <Link
                    href="/admin/profile"
                    prefetch={false}
                    data-testid="admin-nav-profile"
                    className={getNavItemClassName({
                      active: isProfileActive,
                      collapsed,
                      tone: "global",
                    })}
                    title="내 프로필"
                  >
                    <span
                      className={getNavIconWrapperClassName({
                        active: isProfileActive,
                        tone: "global",
                      })}
                    >
                      <SidebarIcon name="profile" />
                    </span>
                    {collapsed ? (
                      <span className="sr-only">내 프로필</span>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">내 프로필</p>
                          <p className="truncate text-[11px] opacity-75">계정 정보 및 접근 권한</p>
                        </div>
                        <span
                          className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-[var(--admin-global-border)] bg-white/70 text-[var(--admin-global-text)]`}
                        >
                          전체
                        </span>
                      </>
                    )}
                  </Link>
                </li>

                {canManageGenerationsFlag ? (
                  <li>
                    <Link
                      href="/admin/generations"
                      prefetch={false}
                      data-testid="admin-nav-generation-settings"
                      className={getNavItemClassName({
                        active: isGenerationSettingsActive,
                        collapsed,
                        tone: "global",
                      })}
                      title="기수 설정"
                    >
                      <span
                        className={getNavIconWrapperClassName({
                          active: isGenerationSettingsActive,
                          tone: "global",
                        })}
                      >
                        <SidebarIcon name="generations" />
                      </span>
                      {collapsed ? (
                        <span className="sr-only">기수 설정</span>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">기수 설정</p>
                            <p className="truncate text-[11px] opacity-75">기수 생성/수정 및 정렬</p>
                          </div>
                          <span
                            className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-[var(--admin-global-border)] bg-white/70 text-[var(--admin-global-text)]`}
                          >
                            전체
                          </span>
                        </>
                      )}
                    </Link>
                  </li>
                ) : null}

                {GLOBAL_RESOURCE_MENU_ITEMS.map((item) => {
                  const active =
                    item.href === "/admin/supporters"
                      ? isGlobalSupportersActive
                      : isGlobalLinktreeActive;
                  const description =
                    item.href === "/admin/supporters"
                      ? "스폰서 노출 상태 관리"
                      : "카테고리 및 링크 구조 관리";

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        data-testid={item.testId}
                        className={getNavItemClassName({
                          active,
                          collapsed,
                          tone: "global",
                        })}
                        title={item.label}
                      >
                        <span
                          className={getNavIconWrapperClassName({
                            active,
                            tone: "global",
                          })}
                        >
                          <SidebarIcon name={item.icon} />
                        </span>
                        {collapsed ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{item.label}</p>
                              <p className="truncate text-[11px] opacity-75">{description}</p>
                            </div>
                            <span
                              className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-[var(--admin-global-border)] bg-white/70 text-[var(--admin-global-text)]`}
                            >
                              전체
                            </span>
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}

                {canManageGlobalUsersFlag ? (
                  <li>
                    <Link
                      href="/admin/users"
                      prefetch={false}
                      data-testid="admin-nav-global-users"
                      className={getNavItemClassName({
                        active: isGlobalUsersActive,
                        collapsed,
                        tone: "global",
                      })}
                      title="사용자 권한"
                    >
                      <span
                        className={getNavIconWrapperClassName({
                          active: isGlobalUsersActive,
                          tone: "global",
                        })}
                      >
                        <SidebarIcon name="users" />
                      </span>
                      {collapsed ? (
                        <span className="sr-only">사용자 권한</span>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">사용자 권한</p>
                            <p className="truncate text-[11px] opacity-75">
                              다중 선택 권한 일괄 변경
                            </p>
                          </div>
                          <span
                            className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-[var(--admin-global-border)] bg-white/70 text-[var(--admin-global-text)]`}
                          >
                            전체
                          </span>
                        </>
                      )}
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>

            <section
              className="rounded-3xl border border-gray-200 bg-white/90 p-2.5"
              data-testid="admin-nav-generation-group"
            >
              {collapsed ? null : (
                <div className="flex items-center justify-between px-2 pb-2">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-gray-500">
                    기수별 관리
                  </p>
                  <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {generationScopeLabel}
                  </span>
                </div>
              )}

              <ul className="space-y-2">
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
                  const description =
                    item.resourcePath === "activities"
                      ? "활동 일정 및 이미지 기록"
                      : item.resourcePath === "exhibitions"
                      ? "전시 정보 및 사진 관리"
                      : "기수별 멤버와 역할 관리";

                  return (
                    <li key={item.resourcePath}>
                      <Link
                        href={href}
                        prefetch={false}
                        data-testid={`admin-nav-${item.shortLabel.toLowerCase()}`}
                        className={getNavItemClassName({
                          active,
                          collapsed,
                          tone: "generation",
                        })}
                        title={item.label}
                      >
                        <span
                          className={getNavIconWrapperClassName({
                            active,
                            tone: "generation",
                          })}
                        >
                          <SidebarIcon name={item.icon} />
                        </span>
                        {collapsed ? (
                          <span className="sr-only">{item.label}</span>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{item.label}</p>
                              <p className="truncate text-[11px] text-gray-500">{description}</p>
                            </div>
                            <span
                              className={`${NAV_ITEM_SCOPE_BADGE_CLASS} border-gray-300 bg-gray-100 text-gray-600`}
                            >
                              {generationScopeLabel}
                            </span>
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </nav>

        <div className="space-y-2.5 border-t border-gray-200/80 p-3">
          {collapsed ? (
            <div className="flex justify-center" data-testid="admin-user-summary-collapsed">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700 shadow-sm"
                title={`${userDisplayName} (${session.user.email})`}
                aria-label={`${userDisplayName} 프로필`}
              >
                {userInitial}
              </div>
            </div>
          ) : (
            <section
              className="rounded-2xl border border-gray-200 bg-white/90 px-3 py-2.5"
              data-testid="admin-user-summary"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-100 text-sm font-semibold text-gray-700">
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

          <div className={`flex items-stretch gap-2 ${collapsed ? "justify-center" : ""}`}>
            <label
              className={`inline-flex items-center rounded-2xl border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text-secondary)] shadow-sm ${
                collapsed ? "w-11 justify-center px-1" : "min-w-0 flex-1 justify-between px-3"
              }`}
            >
              {collapsed ? (
                themeMode === "light" ? (
                  <Sun className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                ) : themeMode === "dark" ? (
                  <Moon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                ) : (
                  <Monitor className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                )
              ) : (
                <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium">
                  {themeMode === "light" ? (
                    <Sun className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  ) : themeMode === "dark" ? (
                    <Moon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  ) : (
                    <Monitor className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                  )}
                  테마
                </span>
              )}
              <AdminSelect
                value={themeMode}
                onChange={(event) => handleThemeModeChange(event.target.value)}
                className={`h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 ${
                  collapsed ? "w-9 text-center text-[11px]" : "w-[7rem] text-right"
                }`}
                data-testid="admin-theme-toggle"
                aria-label="관리자 테마 선택"
              >
                <option value="light">{collapsed ? "L" : "라이트"}</option>
                <option value="dark">{collapsed ? "D" : "다크"}</option>
                <option value="system">{collapsed ? "S" : "기기"}</option>
              </AdminSelect>
            </label>
            <div className={collapsed ? "" : "w-[8.75rem] shrink-0"}>
              <LogoutButton compact={collapsed} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
