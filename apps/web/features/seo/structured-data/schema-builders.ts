/**
 * 사이트 전역 Organization 노드의 `@id`.
 * 홈이 이 id 로 Organization 을 정의하고, 다른 페이지의 JSON-LD 는 이 id 로 참조한다.
 */
export const buildOrganizationId = (siteUrl: string): string =>
  `${siteUrl}/#organization`;

/** 홈이 정의하는 WebSite 노드의 `@id`. 다른 페이지 노드는 isPartOf 로 이 id 를 가리킨다. */
export const buildWebsiteId = (siteUrl: string): string => `${siteUrl}/#website`;

/** 다른 노드가 연영회를 가리킬 때(author·publisher·organizer) 쓰는 Organization 참조. */
export const buildOrganizationRef = (siteUrl: string) => ({
  "@type": "Organization",
  "@id": buildOrganizationId(siteUrl),
  name: "연영회",
  url: siteUrl,
});

const buildBreadcrumbNode = (items: { name: string; url: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/** 순서대로 position 1, 2, … 를 매긴 BreadcrumbList. */
export const buildBreadcrumbJsonLd = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  ...buildBreadcrumbNode(items),
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

type SectionPageType = "AboutPage" | "CollectionPage" | "WebPage";

/**
 * 정적 섹션 페이지의 페이지 노드와 BreadcrumbList. 한 `<JsonLd>` 에 `@graph` 로 넣는다.
 * 최상위를 배열로 두면 JSON-LD 를 읽는 인앱 브라우저·확장 스크립트가 `@context` 를 못 찾아
 * TypeError 를 낸다(YONYOUNG-WEB-E·F). 그래서 @context 를 가진 객체로 감싼다.
 * isPartOf·about 으로 홈의 WebSite·Organization 에 이어 붙여 사이트 그래프를 한 덩어리로 만든다.
 * trail 은 홈 다음 단계부터 이 페이지까지의 경로다.
 */
export const buildSectionPageJsonLd = (
  siteUrl: string,
  type: SectionPageType,
  page: { title: string; description: string; path: string },
  trail: { name: string; path: string }[],
) => {
  const breadcrumb = buildBreadcrumbNode([
    { name: "홈", url: siteUrl },
    ...trail.map((item) => ({ name: item.name, url: `${siteUrl}${item.path}` })),
  ]);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${siteUrl}${page.path}#webpage`,
        url: `${siteUrl}${page.path}`,
        name: page.title,
        description: page.description,
        inLanguage: "ko-KR",
        isPartOf: { "@id": buildWebsiteId(siteUrl) },
        about: { "@id": buildOrganizationId(siteUrl) },
      },
      breadcrumb,
    ],
  };
};
