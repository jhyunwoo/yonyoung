import { compactDisplayName } from "@/features/dashboard/members/user-name";

type MemberNameLike = {
  familyName?: string | null;
  givenName?: string | null;
  name?: string | null;
  email?: string | null;
};

export const buildMemberDisplayName = (member: MemberNameLike): string => {
  const familyName = compactDisplayName(member.familyName);
  const givenName = compactDisplayName(member.givenName);

  if (familyName || givenName) {
    return `${familyName ?? ""}${givenName ?? ""}`;
  }

  const legacyName = compactDisplayName(member.name);
  if (legacyName) {
    return legacyName;
  }

  const email = compactDisplayName(member.email);
  if (email) {
    const localPart = compactDisplayName(email.split("@")[0]);
    if (localPart) {
      return localPart;
    }
  }

  return "이름 미등록";
};

export const buildMemberDisplayInitial = (displayName: string): string => {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return "?";
  }

  return Array.from(trimmed)[0] ?? "?";
};
