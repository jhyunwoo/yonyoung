/**
 * 조건부 className 결합.
 *
 * clsx/tailwind-merge 를 넣지 않는 이유: 이 디자인 시스템의 변형(variant)은
 * 서로 배타적으로 생성되므로 충돌 유틸을 병합할 일이 없다. 마지막 인자로 넘어온
 * 호출자 className 이 뒤에 붙어 Tailwind 의 소스 순서 규칙을 그대로 따른다.
 */
export type ClassValue = string | false | null | undefined;

export const cx = (...parts: ClassValue[]): string =>
  parts
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join(" ");
