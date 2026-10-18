/** 라우트의 `[memberId]` 조각을 사용자 ID로 바꾼다. 비었거나 디코딩할 수 없으면 null이다. */
export const decodeMemberId = (rawMemberId: string): string | null => {
  const trimmedMemberId = rawMemberId.trim();
  if (trimmedMemberId.length === 0) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(trimmedMemberId).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
};
