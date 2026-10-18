import { trimToNull } from "@/shared/utils/trim-to-null";

// ---------------------------------------------------------------------------
// Consolidated display name utilities
// ---------------------------------------------------------------------------

type MemberNameLike = {
  familyName?: string | null;
  givenName?: string | null;
  name?: string | null;
  email?: string | null;
};

export const compactDisplayName = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const compacted = value.replace(/\s+/g, "").trim();
  return compacted.length > 0 ? compacted : null;
};

/** 성+이름 우선, 미등록 시 name, email local-part 순으로 표시 이름을 결정. */
export const buildMemberDisplayName = (member: MemberNameLike): string => {
  const familyName = compactDisplayName(member.familyName);
  const givenName = compactDisplayName(member.givenName);

  if (familyName && givenName) {
    return `${familyName}${givenName}`;
  }

  const name = trimToNull(member.name);
  if (name) {
    return name;
  }

  const email = trimToNull(member.email);
  if (email) {
    const localPart = trimToNull(email.split("@")[0]);
    if (localPart) {
      return localPart;
    }
  }

  return "이름 미등록";
};

/** `buildMemberDisplayName`과 같은 규칙. 프로필·세션 사용자 표시에서 쓰는 이름이다. */
export const formatKoreanName = buildMemberDisplayName;

/** 표시 이름의 첫 글자를 추출. */
export const buildMemberDisplayInitial = (displayName: string): string => {
  const trimmed = displayName.trim();
  if (trimmed.length === 0) {
    return "?";
  }

  return Array.from(trimmed)[0] ?? "?";
};
