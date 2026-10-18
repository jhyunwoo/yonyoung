/**
 * DB 에 저장된 원본 크기로 구한 사진 비율(가로/세로).
 *
 * 크기가 없거나(레거시 데이터) 쓸 수 없는 값이면 null 이다. 그런 사진은 폴백 비율로
 * 먼저 그리고 로드 후 실제 비율을 측정한다. 그리드 · 타일 · 컨트롤러가 이 판정을 같이
 * 써야 "측정 대상" 표시와 실제로 쓰는 비율이 어긋나지 않는다.
 */
export const storedAspect = (item: {
  width: number | null;
  height: number | null;
}): number | null =>
  item.width !== null && item.height !== null && item.height > 0
    ? item.width / item.height
    : null;
