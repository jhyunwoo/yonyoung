import "server-only";

/**
 * 캐시 태그 사전.
 *
 * 태그는 두 층으로 나뉜다.
 *
 *   - **컬렉션 태그** (`public:activities` 등) — 목록 응답에 붙는다. 어떤 항목이든
 *     추가·수정·삭제되면 목록이 바뀌므로 항상 무효화 대상이다.
 *   - **엔티티 태그** (`public:activity:<id>` 등) — 상세 응답에 붙는다. 활동 A 를
 *     고쳤을 때 활동 B·C·D 의 상세까지 버릴 이유가 없다.
 *
 * 엔티티 태그를 나눈 이유: `/archive/records/[id]` 와 `/archive/exhibitions/[id]` 는
 * `generateStaticParams` 로 공개 게시물 전부를 빌드 시점에 굽는다. 상세를 컬렉션
 * 태그로만 묶어 두면 게시물 하나를 수정할 때마다 **모든** 상세 페이지의 캐시가
 * 날아가고, 다음 방문마다 Worker 왕복이 다시 발생했다.
 *
 * 상세 읽기는 컬렉션 태그를 붙이지 않는다(그러면 나누는 의미가 없다). 대신 상세를
 * 바꾸는 모든 쓰기 경로가 반드시 엔티티 태그를 함께 무효화해야 한다 —
 * `tests/unit/server/cache/tags.test.ts` 가 액션별로 이를 고정한다.
 */
export const CACHE_TAGS = {
  public: {
    activities: "public:activities",
    attachments: "public:attachments",
    exhibitions: "public:exhibitions",
    linktree: "public:linktree",
    generations: "public:generations",
    photographers: "public:photographers",
    recruitingPlan: "public:recruiting-plan",
    siteSettings: "public:site-settings",
  },
  admin: {
    generations: "admin:generations",
    activities: "admin:activities",
    attachments: "admin:attachments",
    exhibitions: "admin:exhibitions",
    linktree: "admin:linktree",
    recruitingPlan: "admin:recruiting-plan",
    siteSettings: "admin:site-settings",
    users: "admin:users",
  },
} as const;

export type PublicActivityTag = `public:activity:${string}`;
export type PublicExhibitionTag = `public:exhibition:${string}`;

/** 활동 하나의 상세 응답 태그. */
export const publicActivityTag = (id: string): PublicActivityTag =>
  `public:activity:${id}`;

/** 전시 하나의 상세 응답 태그. */
export const publicExhibitionTag = (id: string): PublicExhibitionTag =>
  `public:exhibition:${id}`;

export type PublicCollectionCacheTag =
  (typeof CACHE_TAGS.public)[keyof typeof CACHE_TAGS.public];

export type PublicCacheTag =
  PublicCollectionCacheTag | PublicActivityTag | PublicExhibitionTag;

export type AdminCacheTag = (typeof CACHE_TAGS.admin)[keyof typeof CACHE_TAGS.admin];

export const PUBLIC_CACHE_TAG_VALUES = Object.values(
  CACHE_TAGS.public,
) as PublicCollectionCacheTag[];
export const ADMIN_CACHE_TAG_VALUES = Object.values(CACHE_TAGS.admin) as AdminCacheTag[];
