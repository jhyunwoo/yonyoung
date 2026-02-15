export const ADMIN_ROLES = ["president", "vice_president", "manager"] as const;
const UNVERIFIED_ROLE = "unverified";

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AuthSession = {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: string | number;
  };
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    nickname?: string | null;
    role?: string | null;
    generationId?: string | null;
  };
};

export const isAdminRole = (role: unknown): role is AdminRole =>
  typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role);

export const isAdminSession = (session: AuthSession | null | undefined): boolean =>
  isAdminRole(session?.user?.role);

export const isUnverifiedRole = (role: unknown): boolean =>
  typeof role === "string" && role.toLowerCase() === UNVERIFIED_ROLE;

export const canAccessAdminPage = (
  session: AuthSession | null | undefined,
): boolean => Boolean(session) && !isUnverifiedRole(session?.user?.role);
