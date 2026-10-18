import "server-only";
import { serverAuthGuard } from "@/features/auth/server/auth-guard";
import { toEditableUserProfile } from "@/features/dashboard/members/user-profile";

const normalizeRole = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** 프로필 API가 돌려준 ID를 쓰고, 없거나 비어 있으면 세션의 사용자 ID로 대신한다. */
export const resolveProfileUserId = (
  profile: Record<string, unknown> | null,
  fallbackUserId: string,
): string => {
  if (!profile) {
    return fallbackUserId;
  }

  const rawId = profile.id;
  if (typeof rawId !== "string") {
    return fallbackUserId;
  }

  const trimmed = rawId.trim();
  return trimmed.length > 0 ? trimmed : fallbackUserId;
};

/** 내 프로필 편집 화면(가입 직후·대시보드)이 쓰는 데이터. 로그인하지 않았으면 null이다. */
export const readEditableProfileData = async (): Promise<{
  role: string | null;
  initialProfile: ReturnType<typeof toEditableUserProfile>;
  resolvedUserId: string;
} | null> => {
  const session = await serverAuthGuard.getSession();
  if (!session) {
    return null;
  }

  const profile = await serverAuthGuard.getCurrentUserProfile(session);

  return {
    role: normalizeRole(session.user.role),
    initialProfile: toEditableUserProfile(profile ?? session.user),
    resolvedUserId: resolveProfileUserId(profile, session.user.id),
  };
};
