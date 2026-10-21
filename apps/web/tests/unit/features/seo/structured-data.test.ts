import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/features/seo/structured-data/json-ld";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdImages,
  buildOrganizationId,
  buildOrganizationRef,
} from "@/features/seo/structured-data/schema-builders";

/*
  기대값은 공용 빌더로 옮기기 전, 상세 페이지가 직접 만들던 JSON-LD 를 빌드된 HTML 에서
  그대로 떠 온 문자열이다. 검색 엔진이 보는 출력이 한 바이트도 바뀌지 않아야 한다.
*/
const SITE_URL = "http://127.0.0.1:3305";

describe("structured-data builders", () => {
  it("활동 기록 상세의 BreadcrumbList 를 그대로 만든다", () => {
    const serialized = serializeJsonLd(
      buildBreadcrumbJsonLd([
        { name: "홈", url: SITE_URL },
        { name: "활동 기록", url: `${SITE_URL}/archive/records` },
        { name: "교내 출사", url: `${SITE_URL}/archive/records/act-1` },
      ]),
    );

    expect(serialized).toBe(
      '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"http://127.0.0.1:3305"},{"@type":"ListItem","position":2,"name":"활동 기록","item":"http://127.0.0.1:3305/archive/records"},{"@type":"ListItem","position":3,"name":"교내 출사","item":"http://127.0.0.1:3305/archive/records/act-1"}]}',
    );
  });

  it("전시 상세의 BreadcrumbList 를 그대로 만든다", () => {
    const serialized = serializeJsonLd(
      buildBreadcrumbJsonLd([
        { name: "홈", url: SITE_URL },
        { name: "전시회", url: `${SITE_URL}/archive/exhibitions` },
        { name: "정기 사진전", url: `${SITE_URL}/archive/exhibitions/exh-1` },
      ]),
    );

    expect(serialized).toBe(
      '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"http://127.0.0.1:3305"},{"@type":"ListItem","position":2,"name":"전시회","item":"http://127.0.0.1:3305/archive/exhibitions"},{"@type":"ListItem","position":3,"name":"정기 사진전","item":"http://127.0.0.1:3305/archive/exhibitions/exh-1"}]}',
    );
  });

  it("Organization 참조는 홈의 Organization 노드 id 를 가리킨다", () => {
    expect(buildOrganizationId(SITE_URL)).toBe("http://127.0.0.1:3305/#organization");
    expect(serializeJsonLd({ organizer: buildOrganizationRef(SITE_URL) })).toBe(
      '{"organizer":{"@type":"Organization","@id":"http://127.0.0.1:3305/#organization","name":"연영회","url":"http://127.0.0.1:3305"}}',
    );
  });

  it("publisher 처럼 참조에 속성을 덧붙여도 키 순서가 유지된다", () => {
    const publisher = {
      ...buildOrganizationRef(SITE_URL),
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/android-chrome-512x512.png`,
      },
    };

    expect(serializeJsonLd({ publisher })).toBe(
      '{"publisher":{"@type":"Organization","@id":"http://127.0.0.1:3305/#organization","name":"연영회","url":"http://127.0.0.1:3305","logo":{"@type":"ImageObject","url":"http://127.0.0.1:3305/android-chrome-512x512.png"}}}',
    );
  });

  it("JSON-LD 이미지는 대표 이미지와 보이는 순서의 상세 이미지 앞 5장만 담는다", () => {
    const detailImages = [7, 1, 3, 2, 6, 5, 4].map((sortOrder) => ({
      imageUrl: `detail-${sortOrder}.jpg`,
      sortOrder,
    }));

    expect(buildJsonLdImages("cover.jpg", detailImages)).toEqual([
      "cover.jpg",
      "detail-1.jpg",
      "detail-2.jpg",
      "detail-3.jpg",
      "detail-4.jpg",
      "detail-5.jpg",
    ]);
    expect(buildJsonLdImages("cover.jpg", [])).toEqual(["cover.jpg"]);
  });
});
