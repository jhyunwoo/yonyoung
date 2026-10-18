export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * 추가 폼이 세부 사진 업로드에 실패해 수정 페이지로 넘겨 보냈을 때 보여 줄 안내 문구.
 * `subject`는 조사까지 붙인 주어다(예: "활동은", "전시는").
 */
export const resolveInitialNoticeMessage = async (
  searchParams: SearchParams,
  subject: string,
): Promise<string | null> => {
  const params = await searchParams;
  if (params.error !== "detail-upload-failed") {
    return null;
  }

  const messageParam = params.message;
  if (typeof messageParam === "string" && messageParam.trim().length > 0) {
    return `${subject} 생성되었지만 일부 세부 이미지 업로드에 실패했습니다: ${messageParam}`;
  }

  return `${subject} 생성되었지만 일부 세부 이미지 업로드에 실패했습니다. 이미지 업로드를 다시 시도해 주세요.`;
};
