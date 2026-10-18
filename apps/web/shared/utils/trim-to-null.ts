/** 문자열이면 앞뒤 공백을 지운 값을, 문자열이 아니거나 비어 있으면 null을 돌려준다. */
export const trimToNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
