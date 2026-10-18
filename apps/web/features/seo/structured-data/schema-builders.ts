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
