# 연영회 웹사이트 SEO 감사 보고서

- 대상: https://yonyoung.yonsei.ac.kr
- 감사 일시: 2026-07-26
- 범위: 운영 sitemap 공개 URL 26개, Next.js 공개 라우트, robots, sitemap, 메타데이터, 구조화 데이터, 콘텐츠, 이미지, 기술 SEO, AI 검색 대응
- 방법: Codex SEO 스킬, 운영 HTML/헤더 크롤링, 로컬 코드 감사, 프로덕션 빌드 산출물 검증

## Executive Summary

운영 사이트의 감사 전 SEO Health Score는 **62/100**으로 평가했습니다. HTTPS, SSR, self-canonical, robots, sitemap, 이미지 대체 텍스트와 기본 Open Graph는 양호했지만, 활동 상세 14개와 전시 상세 3개가 동일한 title/description을 사용하고 `og:url`도 목록 URL을 가리키는 문제가 가장 컸습니다.

이번 구현을 반영한 예상 점수는 **82/100**입니다. 이 점수는 로컬 프로덕션 빌드 검증 기준이며, 운영 배포 후 Search Console과 실사용 Core Web Vitals로 재평가해야 합니다.

| 영역                | 감사 전 | 구현 후 예상 | 근거                                                    |
| ------------------- | ------: | -----------: | ------------------------------------------------------- |
| Technical SEO       |      70 |           86 | 308 리디렉션, sitemap/robots/noindex 정리               |
| Content Quality     |      64 |           72 | 소개 콘텐츠와 내부 링크, 검색 의도형 문구 보강          |
| On-Page SEO         |      55 |           91 | 상세 17개 동적 title/description/canonical/OG           |
| Schema              |      45 |           86 | Organization/WebSite 보강, Article/Event/BreadcrumbList |
| Performance         |      70 |           70 | 필드 CWV 미확보, 기존 최적화 유지                       |
| AI Search Readiness |      45 |           80 | 인용 가능한 설명, 구조화 데이터, llms.txt               |
| Images              |      92 |           92 | alt 누락 없음, 기존 이미지 최적화 유지                  |

## 해결한 주요 문제

### High — 상세 페이지 중복 메타데이터

- 활동 상세 14개와 전시 상세 3개의 title/description이 각각 완전히 동일했습니다.
- `og:url`은 상세 URL이 아니라 `/archive/records` 또는 `/archive/exhibitions`였습니다.
- `generateMetadata`로 실제 콘텐츠 제목과 설명 요약, 고유 URL을 사용하도록 변경했습니다.
- React `cache`로 메타데이터와 페이지 렌더링의 동일 조회를 중복하지 않도록 했습니다.

### High — 상세 구조화 데이터 누락

- 활동 상세에 `Article`과 `BreadcrumbList`를 추가했습니다.
- 전시 상세에 `Event`와 `BreadcrumbList`를 추가했습니다.
- 홈의 `Organization`, `WebSite`에는 안정적인 `@id`, 로고, 창립연도, 설명, 공식 Instagram, 연세대학교 소속 관계, 언어와 publisher를 보강했습니다.
- JSON-LD의 `<` 문자를 이스케이프하는 공통 직렬화 컴포넌트와 회귀 테스트를 추가했습니다.

### High — `/archive` 소프트 리디렉션

- 운영에서는 `/archive`가 `200 + meta refresh`로 응답하면서 sitemap에도 포함돼 있었습니다.
- Next.js 영구 redirect 설정으로 실제 `308`이 되도록 변경했습니다.
- sitemap과 전역 내비게이션은 `/archive/records`를 직접 사용하도록 정리했습니다.

### Medium — sitemap `lastmod` 신뢰도

- 정적 페이지가 실제 변경과 무관하게 요청 시각을 `lastmod`로 출력했습니다.
- 정적 페이지의 `lastmod`는 생략하고, 활동·전시 상세만 실제 `updatedAt`을 유지했습니다.

### Medium — 검색 제외 페이지

- 인증·관리자 URL은 robots 차단만 있어 검색봇이 `noindex`를 읽지 못할 수 있었습니다.
- 관리자 레이아웃과 별도 승인 대기 페이지에 `noindex, nofollow, nocache`를 적용했습니다.
- robots는 API만 차단하고, 공개 헤더의 Dashboard 링크에는 `nofollow`를 추가했습니다.

### Medium — 콘텐츠와 정보 구조

- 홈, 사진가, 모집, 아카이브, 링크, 후원 페이지의 title/description을 검색 의도 중심 문구로 개선했습니다.
- 소개 페이지에 세미나·출사·전시·교류 경험과 활동/전시/모집 내부 링크를 추가했습니다.
- 공개 레이아웃 내부 페이지의 중복 `<main>` 랜드마크를 제거했습니다.

### Medium — AI 검색 대응

- `/llms.txt`에 조직 설명과 핵심 공식 페이지, 인용 지침을 추가했습니다.
- 상세 콘텐츠를 실제 제목·설명·날짜·이미지·장소 단위로 구조화해 검색엔진과 AI가 독립 문서로 이해하도록 개선했습니다.

## 유지 중인 강점

- HTTP에서 HTTPS로 1회 리디렉션
- self-canonical과 query 제거
- 초기 HTML에 주요 본문과 H1 렌더링
- 홈 LCP 이미지의 priority/preload, CDN preconnect, responsive sizes
- 공개 페이지 이미지 alt 누락 없음
- CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy 등 보안 헤더
- 실제 콘텐츠 `updatedAt`을 사용하는 동적 sitemap 항목
- Google·Naver 사이트 소유권 확인 파일

## 남은 우선 과제

1. **운영 주소 확인:** 푸터의 `연희로 50`은 [연세대학교 공식 주소](https://www.yonsei.ac.kr/sc/502/subview.do) `연세로 50`과 다릅니다. 운영 설정에서 사실 확인 후 수정해야 합니다.
2. **상세 작성자·참여자 정보:** 촬영자, 참여 사진가, 기수, 게시일·수정일을 화면에도 표시하면 E-E-A-T가 더 강해집니다.
3. **전시 장소 주소:** 현재 모델은 장소명만 있어 Google Event 권장 상세 주소를 제공하지 못합니다. `placeAddress` 필드가 필요합니다.
4. **Core Web Vitals:** PageSpeed API quota와 브라우저 부재로 LCP/INP/CLS 필드값을 확보하지 못했습니다. 기존 Web Vitals 수집 로그의 모바일 p75를 집계해야 합니다.
5. **HTML/JS 크기:** 홈과 대형 갤러리, 사진가 페이지의 RSC payload와 클라이언트 JS를 줄일 여지가 있습니다.
6. **소프트 404 확인:** 존재하지 않는 동적 상세는 일반 클라이언트에서 스트리밍 때문에 `200 + noindex`가 될 수 있습니다. 배포 후 Googlebot 응답과 Search Console URL 검사를 확인해야 합니다.
7. **운영·개인정보 안내:** 연락처, 계정, 방문 통계와 관련한 최소 개인정보/운영 정책 페이지가 있으면 신뢰도가 높아집니다.

## 검증 결과

- ESLint: 통과
- TypeScript: 통과
- Vitest: 44개 파일, 185개 테스트 통과
- Next.js production build: 통과
- 로컬 production 응답:
  - `/archive`: 308
  - `/sitemap.xml`: 25개 URL, `/archive` 제외, 정적 `lastmod` 제거
  - 활동 상세: 고유 title/description/canonical/og:url + Article/BreadcrumbList
  - 전시 상세: 고유 title/description/canonical/og:url + Event/BreadcrumbList
  - `/auth/sign-in`, `/auth/profile`, `/auth/pending-approval`: noindex
  - `/llms.txt`: 200

## 제한사항

- Google Search Console, GA4, CrUX, PageSpeed API 자격 증명이 없어 검색 성과와 필드 CWV는 포함하지 않았습니다.
- Moz/Bing API 자격 증명이 없어 상세 백링크 평가는 포함하지 않았습니다.
- 이 보고서는 코드 구현과 로컬 프로덕션 검증까지 포함하지만 운영 배포는 수행하지 않았습니다.
