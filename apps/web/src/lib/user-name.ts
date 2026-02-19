type UserNameLike = {
  familyName?: string | null;
  givenName?: string | null;
  email?: string | null;
};

const toTrimmedOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const formatKoreanName = (user: UserNameLike): string => {
  const familyName = toTrimmedOrNull(user.familyName);
  const givenName = toTrimmedOrNull(user.givenName);

  if (familyName || givenName) {
    return `${familyName ?? ""}${givenName ?? ""}`;
  }

  const email = toTrimmedOrNull(user.email);
  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart && localPart.length > 0) {
      return localPart;
    }
  }

  return "이름 미등록";
};
