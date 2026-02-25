type MemberNameLike = {
  familyName?: string | null;
  givenName?: string | null;
  name?: string | null;
  email?: string | null;
};

const toTrimmedOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const buildMemberDisplayName = (member: MemberNameLike): string => {
  const familyName = toTrimmedOrNull(member.familyName);
  const givenName = toTrimmedOrNull(member.givenName);

  if (familyName || givenName) {
    return `${familyName ?? ""}${givenName ?? ""}`;
  }

  const legacyName = toTrimmedOrNull(member.name);
  if (legacyName) {
    return legacyName;
  }

  const email = toTrimmedOrNull(member.email);
  if (email) {
    const localPart = email.split("@")[0]?.trim();
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
