import type { AuthUser } from "./auth-shared";
import { formatKoreanName } from "./user-name";

type EditableUserProfile = {
  image: string;
  familyName: string;
  givenName: string;
  college: string;
  department: string;
  studentNumber: string;
  phoneNumber: string;
};

type EditableUserProfileKey = keyof EditableUserProfile;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readString = (
  source: Record<string, unknown> | null | undefined,
  key: EditableUserProfileKey,
): string => {
  if (!source) {
    return "";
  }

  const value = source[key];
  return typeof value === "string" ? value : "";
};

const readTrimmedStringByKey = (
  source: Record<string, unknown> | null | undefined,
  key: EditableUserProfileKey,
): string | null => {
  const value = readString(source, key).trim();
  return value.length > 0 ? value : null;
};

const readTrimmedSessionString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const toEditableUserProfile = (value: unknown): EditableUserProfile => {
  const source = asRecord(value);

  return {
    image: readString(source, "image"),
    familyName: readString(source, "familyName"),
    givenName: readString(source, "givenName"),
    college: readString(source, "college"),
    department: readString(source, "department"),
    studentNumber: readString(source, "studentNumber"),
    phoneNumber: readString(source, "phoneNumber"),
  };
};

type DashboardViewerProfile = {
  id: string;
  email: string;
  image: string | null;
  displayName: string;
};

export const buildDashboardViewerProfile = (
  sessionUser: AuthUser,
  profile: Record<string, unknown> | null,
): DashboardViewerProfile => {
  const familyName =
    readTrimmedStringByKey(profile, "familyName") ??
    readTrimmedSessionString(sessionUser.familyName);
  const givenName =
    readTrimmedStringByKey(profile, "givenName") ??
    readTrimmedSessionString(sessionUser.givenName);
  const image =
    readTrimmedStringByKey(profile, "image") ?? readTrimmedSessionString(sessionUser.image);

  const fallbackName = readTrimmedSessionString(sessionUser.name);
  const computedName = formatKoreanName({
    familyName,
    givenName,
    email: sessionUser.email,
  });

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    image,
    displayName:
      computedName === "이름 미등록" && fallbackName ? fallbackName : computedName,
  };
};
