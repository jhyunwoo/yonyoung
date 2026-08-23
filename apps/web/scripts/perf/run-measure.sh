#!/usr/bin/env bash
# 프로덕션 서버 + mock API 를 띄우고 런타임 측정을 돌린 뒤 정리한다.
# 사용: ./scripts/perf/run-measure.sh <출력파일> [--profile mobile|desktop]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

OUT="${1:?usage: run-measure.sh <out.json> [extra measure args...]}"
shift || true

MOCK_PORT="${MOCK_API_PORT:-4010}"
WEB_PORT="${WEB_PORT:-3005}"

MOCK_PID=""
WEB_PID=""
cleanup() {
  [[ -n "$MOCK_PID" ]] && kill "$MOCK_PID" 2>/dev/null || true
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT

if ! curl -sf "http://127.0.0.1:${MOCK_PORT}/__test/health" >/dev/null 2>&1; then
  MOCK_API_PORT="$MOCK_PORT" pnpm exec tsx tests/e2e/mock-api/server.ts >/dev/null 2>&1 &
  MOCK_PID=$!
fi

API_BASE_URL="http://127.0.0.1:${MOCK_PORT}" \
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:${WEB_PORT}" \
  pnpm exec next start --hostname 127.0.0.1 --port "$WEB_PORT" >/dev/null 2>&1 &
WEB_PID=$!

for _ in $(seq 1 120); do
  if curl -sf "http://127.0.0.1:${WEB_PORT}/" >/dev/null 2>&1 \
    && curl -sf "http://127.0.0.1:${MOCK_PORT}/__test/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

node scripts/perf/measure.mjs \
  --out "$OUT" \
  --base "http://127.0.0.1:${WEB_PORT}" \
  --mock "http://127.0.0.1:${MOCK_PORT}" \
  "$@"
