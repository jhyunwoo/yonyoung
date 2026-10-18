/** 숨긴 파일 input을 대신 여는 "파일 선택" 버튼의 모양. */
export const FILE_SELECT_BUTTON_CLASS_NAME =
  "inline-flex rounded-lg border border-hairline-strong bg-surface px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60";

/** 사진 필드 버튼의 data-testid 접두사. 리터럴로 묶어 testid가 늘 정해진 모양이 되게 한다. */
export type MediaFieldTestIdPrefix = `${"activity" | "exhibition"}-${"create" | "edit"}`;
