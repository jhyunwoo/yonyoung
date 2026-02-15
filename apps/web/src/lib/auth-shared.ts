export const AUTH_ROLE_VALUES = [
  "president",
  "vice_president",
  "manager",
  "member",
  "new_member",
  "associate_member",
  "regular_member",
  "unverified",
] as const;

export type KnownAuthRole = (typeof AUTH_ROLE_VALUES)[number];
export type AuthRole = KnownAuthRole | (string & {});

export const ADMIN_ROLES = ["president", "vice_president", "manager"] as const;
const PRESIDENT_ROLE = "president";
const UNVERIFIED_ROLE = "unverified";

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  nickname?: string | null;
  role?: AuthRole | null;
  generationId?: string | null;
};

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string | number;
  };
  user: AuthUser;
};

type SessionWithRole =
  | {
      user?: {
        role?: unknown;
        [key: string]: unknown;
      };
    }
  | null
  | undefined;

export const getRoleFromSession = (session: SessionWithRole): AuthRole | null => {
  const rawRole = session?.user?.role;
  if (typeof rawRole !== "string" || rawRole.length === 0) {
    return null;
  }

  return rawRole as AuthRole;
};

export const isAdminRole = (role: unknown): role is AdminRole =>
  typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);

export const isAdminSession = (session: SessionWithRole): boolean =>
  isAdminRole(getRoleFromSession(session));

export const isUnverifiedRole = (role: unknown): boolean =>
  typeof role === "string" && role.toLowerCase() === UNVERIFIED_ROLE;

export const isPresidentRole = (role: unknown): role is typeof PRESIDENT_ROLE =>
  typeof role === "string" && role === PRESIDENT_ROLE;

export const canAccessAdminPage = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return !isUnverifiedRole(getRoleFromSession(session));
};

export const canManageGenerations = (session: SessionWithRole): boolean => {
  if (!session) {
    return false;
  }

  return isPresidentRole(getRoleFromSession(session));
};
