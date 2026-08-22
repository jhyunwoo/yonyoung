/**
 * 스티커 액센트 팔레트.
 *
 * DESIGN.md 의 규칙: 이 색들은 **장식 전용**이다. 일러스트 · 아이콘 타일 ·
 * 카테고리 점에만 쓰고, CTA 나 구조적 채움에는 절대 쓰지 않는다.
 * 텍스트를 얹을 때는 반드시 --accent-ink 를 써야 라이트/다크 양쪽에서 읽힌다.
 */

export const STICKER_ACCENTS = [
  "sky",
  "purple",
  "pink",
  "orange",
  "teal",
  "green",
] as const;

export type StickerAccent = (typeof STICKER_ACCENTS)[number];

/** 아이콘 타일 배경. 액센트를 옅게 깔고 글자/아이콘은 accent-ink 로 얹는다. */
const TILE_CLASS: Record<StickerAccent, string> = {
  sky: "bg-accent-sky/25 text-accent-ink",
  purple: "bg-accent-purple/35 text-accent-ink",
  pink: "bg-accent-pink/20 text-accent-ink",
  orange: "bg-accent-orange/20 text-accent-ink",
  teal: "bg-accent-teal/20 text-accent-ink",
  green: "bg-accent-green/20 text-accent-ink",
};

/** 카테고리 점 · 기수 인디케이터용 실색 */
const DOT_CLASS: Record<StickerAccent, string> = {
  sky: "bg-accent-sky",
  purple: "bg-accent-purple",
  pink: "bg-accent-pink",
  orange: "bg-accent-orange",
  teal: "bg-accent-teal",
  green: "bg-accent-green",
};

export const stickerTileClass = (accent: StickerAccent): string => TILE_CLASS[accent];

export const stickerDotClass = (accent: StickerAccent): string => DOT_CLASS[accent];

/**
 * 같은 시드는 항상 같은 액센트를 받는다 — 기수 배지나 아바타가 렌더마다
 * 색이 바뀌면 시각적 앵커 역할을 못 한다.
 */
export const resolveStickerAccent = (seed: string): StickerAccent => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100_000;
  }
  // 나머지 연산 결과는 항상 유효한 인덱스지만 타입만으로는 그 사실을 알 수 없다.
  return STICKER_ACCENTS[hash % STICKER_ACCENTS.length] ?? STICKER_ACCENTS[0];
};
