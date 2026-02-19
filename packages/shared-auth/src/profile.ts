export const REQUIRED_PROFILE_KEYS = [
  "familyName",
  "givenName",
  "college",
  "department",
  "studentNumber",
  "phoneNumber",
] as const;

export type RequiredProfileKey = (typeof REQUIRED_PROFILE_KEYS)[number];

export const STUDENT_NUMBER_REGEX = /^\d{10}$/;

const readProfileField = (
  user: Record<string, unknown>,
  key: RequiredProfileKey,
): string | null => {
  const value = user[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const hasCompletedRequiredProfileFields = (
  user: Record<string, unknown> | null | undefined,
): boolean => {
  if (!user) {
    return false;
  }

  return REQUIRED_PROFILE_KEYS.every((key) => readProfileField(user, key) !== null);
};
