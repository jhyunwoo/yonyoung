/**
 * 사이트 전역 Organization 노드의 `@id`.
 * 홈이 이 id 로 Organization 을 정의하고, 다른 페이지의 JSON-LD 는 이 id 로 참조한다.
 */
export const buildOrganizationId = (siteUrl: string): string =>
  `${siteUrl}/#organization`;

/** 다른 노드가 연영회를 가리킬 때(author·publisher·organizer) 쓰는 Organization 참조. */
export const buildOrganizationRef = (siteUrl: string) => ({
  "@type": "Organization",
  "@id": buildOrganizationId(siteUrl),
  name: "연영회",
  url: siteUrl,
});

/** 순서대로 position 1, 2, … 를 매긴 BreadcrumbList. */
export const buildBreadcrumbJsonLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

const JSON_LD_DETAIL_IMAGE_LIMIT = 5;

/**
 * 상세 페이지 JSON-LD 의 image 배열. 대표 이미지 + 갤러리에 보이는 순서의 앞 몇 장만 담는다.
 * 사진이 수십 장인 게시물에서 전부 넣으면 HTML 이 수백 KB 로 불어나는데, 검색엔진은 몇 장만 쓴다.
 */
export const buildJsonLdImages = (
  coverImageUrl: string,
  detailImages: { imageUrl: string; sortOrder: number }[],
): string[] => [
  coverImageUrl,
  ...detailImages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, JSON_LD_DETAIL_IMAGE_LIMIT)
    .map((image) => image.imageUrl),
];
