연세대학교 중앙동아리 연영회의 웹사이트를 만들거야. 기본적인 웹사이트 디자인인 완성되어 있어.

기술 스택

- Turborepo를 사용하여 Monorepo로 웹 서버와 백엔드 서버 관리
- Web
  - Next.js 16 (App router) 사용
  - better auth 적용
  - Tailwind CSS V4 적용
  - yonyoung-web-preview 폴더에 이미 구현된 웹사이트 디자인을 참고하여 전체 웹사이트 디자인 구성
  - yonyoung-web-preview 폴더 안에 구현된 웹사이트를 참고하여 전체 웹사이트 구조 파악 및 구현
  - TDD 기반 개발 방식 사용 (Playwright, Vitest 적용)
  - opennext를 사용하여 Cloudflare Workers에 배포
  - SSR 적극 활용
  - 최신 기술 적극 활용 (Next.js 문서 참조)
  - zod validation 적용
  - Framer Motion을 활용하여 애니메이션 구현
  - 페이지 구성 및 다지인은 yonyoung-web-preview 참고
  - Admin 페이지 제작
  - Admin 페이지 로그인은 Google 계정 및 패스키로 가능하게 설정
  - Admin에서 웹사이트에 계시되는 계시물들을 관리할 수 있게 설정
  - 모바일 최적화 진행
  - 라이트모드 다크모드 구분
  - Storybook을 사용하여 디자인 시스템 구축 및 코드 재사용성 확보

- Server
  - Hono.js 사용
  - Cloudflare Workers에 배포하는 것을 가정하고 개발
  - Cloudflare R2 스토리지 사용
  - Cloudflare D1 데이터베이스 사용
  - Cloudflare KV 사용
  - better auth를 사용하여 프론트엔드와 함께 로그인 로직 개발
  - 웹사이트의 기능에 필요한 모든 기능을 완벽하게 구현
  - TDD 기반 구현 및 CI/CD에서 유닛 테스트 및 서버 로직 테스트까지 완벽하게 코드 품질을 검사할 수 있도록 구성

- Monorepo
  - 웹과 서버를 모두 테스트 구동이 가능하도록 turborepo 명령어 구성
  - Cache를 적극적으로 활용할 수 있도록 Turborepo 구성
  - Turborepo는 최신 버전을 사용하고 최신 문서 내용을 적극적으로 참조하여 프로젝트 구성

# 전체 적용 사항

- 코드 품질에 각별히 신경써야함
- 코드 재사용성을 높이기 위해 노력해야 함 (Monorepo에서 공용라이브러리를 사용하여 코드 공유 등의 방법 활용)
- Lint를 적용하여 일관된 코딩 스타일 및 예상치 못한 오류가 발생하지 않도록 함
- 일관된 코딩 스타일을 적용하여 처음 보는 사람도 이해하기 쉬운 코드 및 함수명을 사용해야 함
- TDD 기반 개발로 모든 기능이 신뢰성 있게 작동해야 함.
- Cloudflare 에 배포하는 환경에 맞춰 성능 최적화를 진행
- 최신 문서를 적극적으로 참고하여 코드 구성
- 패키지 관리자는 pnpm을 사용

위 기술 및 명세를 바탕으로 현재 폴더 위에 웹사이트 및 서버를 구축해줘. 모든 기능이 완벽하게 동작할 수 있으며 유지관리가 잘 될 수 있도록 코드를 작성해줘. 모든 과정을 실행하기 위한 플랜을 세우고 플랜을 실행시켜줘. 모든 플랜이 끝나면 모든 기능이 정상적으로 작동하는지 검증하는 과정까지 거쳐야해.
