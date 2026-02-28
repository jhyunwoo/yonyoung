# Security Hardening

## 1) 기본 보안 헤더

### API (`apps/api/src/middlewares/security-headers.ts`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- HTTPS 요청에서만 `Strict-Transport-Security` 추가

### Web (`apps/web/src/middleware.ts`)
- 위 정책 + `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`
- Private 경로는 `Cache-Control: private, no-store, max-age=0`

### CSP rollout
- 기본값: `Content-Security-Policy-Report-Only` (점진 적용)
- 설정 플래그:
  - API: `CSP_REPORT_ONLY` (`wrangler vars`)
  - Web: `CSP_REPORT_ONLY` (Worker env)
- 운영 전환 시 `CSP_REPORT_ONLY=false`로 enforce 가능

## 2) 에러/로그 민감정보 보호

### 에러 응답 표준화
- 포맷: `error.code`, `error.message`, `error.requestId`
- 내부 예외는 일반화된 메시지 사용 (`INTERNAL_ERROR`)

### 로그 정책
- 구조화 JSON 로그(`request.received`, `request.completed`, `request.failed`)
- 민감 헤더 마스킹: `authorization`, `cookie`, `set-cookie`, `x-api-key`
- 에러 메시지에서 `token/secret/password` 패턴 마스킹

## 3) WAF / Rate Limiting 운영 가이드

Cloudflare에서 아래 룰을 우선 적용:

1. 인증 엔드포인트 보호 (Credential Stuffing / ATO)
- `/api/auth/sign-in`
- `/api/auth/sign-up`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- 권장: IP + User-Agent + 계정 식별자 복합 레이트 제한

2. 고비용 API 보호
- 검색/리스트 대량 조회, 업로드 관련 API
- 권장: burst 제한 + 분당 제한 분리

3. Bot signal 연동
- Bot score 기반 challenge/rate limiting 단계적 적용

4. 알람
- 401/403/429 급증, 로그인 실패율 급증, 업로드 실패율 급증 알림

## 4) 취약점 대응 프로세스

### 자동 점검
- 루트 스크립트: `pnpm security:audit`
- 명령: `pnpm audit --prod --audit-level=critical`
- `quality:ci`에 포함되어 PR/메인 브랜치 CI에서 자동 수행

### 운영 프로세스
1. 취약점 접수: GitHub Advisory, npm advisory, Cloudflare security notice
2. 분류: exploitable 여부 / runtime 영향 / 노출 범위
3. 대응: 패치 버전 업그레이드, 영향 테스트, 배포
4. 후속 조치: 관련 키/토큰 회전(필요 시), 재발 방지 이슈화

## 5) 시크릿 관리
- 시크릿은 Wrangler secret 또는 CI secret store 사용
- `.env*`는 저장소 커밋 금지
- 유출 의심 시 즉시 회전 + 세션 무효화
