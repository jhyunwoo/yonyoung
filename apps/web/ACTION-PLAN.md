# 연영회 SEO Action Plan

## 완료

- [x] 활동·전시 상세 동적 title, description, canonical, Open Graph 적용
- [x] 활동 `Article`, 전시 `Event`, 상세 `BreadcrumbList` JSON-LD 추가
- [x] 홈 `Organization`, `WebSite` 엔티티 보강
- [x] 안전한 JSON-LD 직렬화와 테스트 추가
- [x] `/archive`를 실제 308 영구 리디렉션으로 변경
- [x] sitemap에서 소프트 리디렉션 URL 제거
- [x] 정적 sitemap `lastmod: now` 제거
- [x] 인증·관리자 페이지 noindex 및 Dashboard 링크 nofollow
- [x] robots 규칙 단순화와 API 크롤링 차단
- [x] 주요 정적 페이지 title/description 개선
- [x] 소개 페이지 콘텐츠와 문맥 내부 링크 보강
- [x] 중복 main landmark 제거
- [x] llms.txt 추가
- [x] HSTS 헤더 추가
- [x] 린트, 타입, 유닛 테스트, 프로덕션 빌드 검증

## 배포 직후 — Critical/High

1. 배포 URL에서 상세 2개 이상을 확인합니다.
   - 고유 title/description
   - self canonical과 동일한 `og:url`
   - JSON-LD 파싱
2. `/archive`가 308인지 확인하고 sitemap을 Search Console과 Naver Search Advisor에 다시 제출합니다.
3. Rich Results Test로 대표 활동과 전시 상세를 검사합니다.
4. 운영 사이트 설정의 주소가 `연희로 50`인지 `연세로 50`인지 공식 자료와 대조해 통일합니다.

## 1주 이내 — High

1. Search Console URL 검사로 홈, 소개, 모집, 대표 활동, 대표 전시의 색인 상태를 확인합니다.
2. 촬영자·참여 사진가·기수·게시일·수정일 데이터 모델과 화면 표시를 설계합니다.
3. 전시에 구조화된 장소 주소 필드를 추가합니다.
4. Web Vitals 로그에서 모바일 p75를 집계합니다.
   - LCP < 2.5s
   - INP < 200ms
   - CLS < 0.1

## 1개월 이내 — Medium

1. 사진가 페이지를 기수별 점진 렌더링 또는 페이지네이션으로 분리합니다.
2. 대형 상세 갤러리의 초기 RSC payload와 이미지 메타데이터를 줄입니다.
3. 활동·전시 상세에 이전/다음 기록과 같은 기수 관련 기록을 연결합니다.
4. 소개·모집·후원 페이지에 현재 운영 기수와 자료 기준일을 표시합니다.
5. 개인정보/운영 정책 페이지와 푸터 링크를 추가합니다.

## 측정 KPI

- Search Console 유효 색인 상세 URL 수
- 상세 페이지별 impressions, clicks, CTR
- `연영회`, `연세대 사진동아리`, `연세대학교 사진동아리 모집`, `연영회 전시` 검색 노출
- 모바일 LCP/INP/CLS p75
- 자연 검색 유입 후 활동·전시 상세 클릭률
- 모집 페이지에서 문의/지원 CTA 이동률
