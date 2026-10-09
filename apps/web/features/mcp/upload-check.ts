import { normalizeUploadContentType } from "@yonyoung/contracts/uploads";

/**
 * 서버는 준비할 때 알려준 크기·형식과 정확히 같은 파일만 받는다.
 * 올리기 전에 같은 조건을 확인해 실패하는 업로드를 줄인다.
 */
export const checkSelectedFile = (
  file: { size: number; type: string },
  expected: { declaredSize: number; contentType: string },
): string | null => {
  if (file.size !== expected.declaredSize) {
    return `AI에게 보낸 파일과 크기가 다릅니다(${expected.declaredSize.toLocaleString("ko-KR")} bytes). 대화에 첨부한 것과 같은 파일을 골라 주세요.`;
  }
  if (normalizeUploadContentType(file.type) !== expected.contentType) {
    return `파일 형식이 다릅니다. ${expected.contentType} 파일을 골라 주세요.`;
  }
  return null;
};
