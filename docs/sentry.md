# Sentry 운영 설정

현재 운영 설정은 `moveto/yonyoung-web` 프로젝트를 공유하며 `service=web`과 `service=api` 태그로 구분한다. 조직의 프로젝트 생성 권한 제한으로 API 전용 프로젝트는 생성하지 못했다. 추후 별도 프로젝트를 만들면 API의 `SENTRY_DSN`만 교체할 수 있다. SDK는 각 앱에만 설치하며 contracts에는 의존성을 추가하지 않는다. DSN이 없으면 이벤트를 전송하지 않는다. 오류만 수집하고 성능 추적, Replay, Sentry Logs는 비활성화한다. 기존 구조화 로그와 브라우저 오류 beacon은 유지한다.

## Web (Next.js)

배포 환경에 다음 변수를 설정한다. `NEXT_PUBLIC_*` 값은 빌드 시 브라우저 번들에 포함되므로 변경 후 재빌드한다.

| 변수                             | 용도                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`         | web 프로젝트 DSN. 공개 가능한 SDK 수집 주소               |
| `SENTRY_DSN`                     | 서버 DSN. 생략하면 공개 DSN 사용                          |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | 브라우저 환경명. 기본값 NODE_ENV                          |
| `SENTRY_ENVIRONMENT`             | 서버 환경명. 기본값 NODE_ENV                              |
| `SENTRY_ORG`, `SENTRY_PROJECT`   | 소스맵 업로드 대상 slug                                   |
| `SENTRY_AUTH_TOKEN`              | 빌드 환경의 소스맵 업로드 토큰. 공개 변수로 설정하지 않음 |
| `SENTRY_RELEASE`                 | 선택적 release ID, 예: Git commit SHA                     |

`withSentryConfig`가 토큰이 있는 빌드에서 소스맵을 업로드하고 삭제한다. 토큰이 없는 로컬/CI 빌드도 가능하다. Turbo는 DSN과 release 변경을 빌드 캐시에 반영하고 토큰은 비밀 환경 변수로 전달한다. 브라우저 CSP에는 DSN의 정확한 origin만 추가하며 별도 Sentry tunnel/BFF 경로는 만들지 않는다.

## API (Cloudflare Workers)

Cloudflare 배포 환경에 `SENTRY_DSN`, `SENTRY_ENVIRONMENT`(production/staging/development), 선택적으로 `SENTRY_RELEASE`를 설정한다. DSN은 `pnpm --filter @yonyoung/api exec wrangler secret put SENTRY_DSN --env=""`로 등록할 수 있다. 개발 환경은 `--env dev`를 사용한다. 로컬에서는 무시되는 `apps/api/.dev.vars`에 설정한다. 환경별 DSN을 혼용하지 않는다.

기본 Worker와 PublicApi의 fetch에 요청별 Sentry scope와 waitUntil flush를 적용한다. SDK 초기화 전에 current scope도 복제하여 동시 요청의 client와 중복 제거 상태가 섞이지 않도록 한다. PublicApi의 인증 헤더 제거와 캐시 경계는 유지한다. Hono가 처리한 5xx 예외도 수집하고 예상된 4xx는 수집하지 않는다. 오류 이벤트에 requestId와 오류 코드를 포함한다.

API 소스맵이 필요한 배포에서는 동일한 release ID로 아래 명령을 실행한다. 이 명령은 **실제 배포**이며 일반 build/dry-run에는 포함하지 않는다. `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_RELEASE`를 CI 비밀/환경 변수로 미리 설정한다.

```sh
pnpm --filter @yonyoung/api exec wrangler deploy --env="" --minify --outdir .wrangler/sentry-deploy --upload-source-maps --var "SENTRY_RELEASE:$SENTRY_RELEASE"
pnpm --dir apps/api dlx @sentry/cli@2.58.6 sourcemaps upload --release "$SENTRY_RELEASE" --strip-prefix .wrangler/sentry-deploy/.. .wrangler/sentry-deploy
```

## 개인정보와 검증

`sendDefaultPii`는 꺼져 있다. 전송 직전에 요청 헤더·본문·쿼리·사용자·extra·breadcrumbs를 제거한다. 오류 메시지와 스택은 진단 목적으로 남으므로 예외 메시지에 비밀값을 넣지 않는다.

브라우저 수집 검증은 `NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.invalid/1 pnpm --filter @yonyoung/web exec bash scripts/run-playwright.sh test tests/e2e/sentry.spec.ts`로 실행한다. 가짜 ingest 요청을 Playwright가 가로채므로 외부 전송 없이 CSP와 SDK의 오류 전송을 확인한다.

단위 테스트는 DSN 미설정, 정보 제거, 오류 화면 재시도, 4xx/5xx 분류를 확인한다. Workers 테스트는 실제 SDK의 메모리 transport로 이벤트 전송과 동시 요청 격리를 확인하며 외부 Sentry에 전송하지 않는다.

배포 후 staging에서 브라우저 예외와 API 5xx를 각각 발생시켜 해당 프로젝트의 Issues에 들어오는지, environment/release 및 소스 위치가 맞는지 확인한다. 테스트 전용 공개 오류 엔드포인트는 추가하지 않는다. 실제 DSN/토큰이 없는 검증은 Sentry 계정의 수신 및 소스맵 업로드 성공까지 확인하지 못한다.

참고: [Next.js 수동 설정](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/), [Workers 설정](https://docs.sentry.io/platforms/javascript/guides/cloudflare/install/wrangler/), [Wrangler 소스맵](https://docs.sentry.io/platforms/javascript/guides/cloudflare/sourcemaps/uploading/wrangler/).

## 의존성 감사 참고

현재 고정된 Wrangler의 선택적 Miniflare 의존성 `sharp@0.35.2`에 high 취약점이 있다. Sentry SDK의 Wrangler peer 연결 때문에 production audit에서도 `@sentry/cloudflare > wrangler > miniflare > sharp` 경로로 표시된다. Worker 런타임 코드에서 sharp를 사용하지는 않는다. 저장소의 기존 버전 보존 규칙에 따라 이번 변경에서는 도구 업그레이드를 포함하지 않았다. 기존 production audit의 critical 차단 기준은 통과한다.
