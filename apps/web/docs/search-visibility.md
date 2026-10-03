# 연영회 검색 노출 관리

목표 검색어는 `대학교 사진 동아리`이며, 연영회가 연세대학교 중앙사진동아리라는
실제 정체성과 출사·세미나·전시 활동으로 검색 의도에 답한다. 제목과 설명은
`features/seo/metadata/page-seo.ts`에서 관리한다. 검색어를 반복하거나 보이지 않는
텍스트를 추가하지 않는다.

## 배포 후 확인

1. 운영 홈페이지의 제목이 `연영회 | 연세대학교 사진 동아리`인지 확인한다.
2. Google Search Console에서 `https://yonyoung.yonsei.ac.kr` 속성의 소유권을
   확인한다. 기존 인증이 있다면 그대로 사용한다.
3. 사이트맵 `https://yonyoung.yonsei.ac.kr/sitemap.xml`을 제출하고 읽기 성공 여부를
   확인한다.
4. URL 검사에서 `/`, `/about`, `/about/recruiting`의 실제 URL 테스트를 실행한다.
   크롤링 허용 여부, 렌더링된 본문과 Google이 선택한 canonical을 확인하고 색인
   생성을 요청한다. 색인 요청은 노출이나 순위를 보장하지 않는다.
5. 실적 보고서에서 `대학교 사진 동아리`, `대학생 사진 동아리`, `연세대학교 사진
동아리`, `연영회` 검색어의 노출수·클릭수·평균 게재순위를 변경 전후로 비교한다.
   재크롤링과 반영에는 시간이 필요하므로 배포 직후의 순위만으로 판단하지 않는다.

소유권 인증과 색인 요청은 Search Console 계정에서 진행하는 운영 작업이며,
코드 변경이나 로컬 테스트로 완료되는 작업이 아니다.

## 콘텐츠 유지

- 출사와 전시 게시물에 실제 활동명, 장소, 일정과 고유한 활동 설명을 작성한다.
- 모집 페이지의 일정과 지원 자격은 실제 모집 안내에 맞게 유지한다.
- 학교의 공식 동아리 소개와 공식 SNS에 홈페이지 링크가 정확히 등록되어 있는지
  확인한다.
- 공개 페이지의 canonical, robots, 사이트맵과 JSON-LD를 변경할 때는
  `tests/e2e/seo.spec.ts`도 실행한다.

참고: [Google 검색 기본사항](https://developers.google.com/search/docs/essentials),
[사이트맵 제출](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[재크롤링 요청](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
