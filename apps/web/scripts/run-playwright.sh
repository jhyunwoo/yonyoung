#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB_CACHE_DIR="$ROOT_DIR/.cache/playwright-libs"
DEB_CACHE_DIR="$ROOT_DIR/.cache/playwright-debs"
LIB_DIR="$LIB_CACHE_DIR/usr/lib/x86_64-linux-gnu"

download_package() {
  local package_name="$1"
  if apt download "$package_name" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

ensure_browser_binaries() {
  pnpm exec playwright install chromium
}

ensure_linux_runtime_libraries() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    return 0
  fi

  local required_libs=(
    "libnspr4.so"
    "libnss3.so"
    "libnssutil3.so"
    "libsmime3.so"
    "libasound.so.2"
  )

  local missing=0
  for library in "${required_libs[@]}"; do
    if [[ -f "$LIB_DIR/$library" ]]; then
      continue
    fi

    if ldconfig -p 2>/dev/null | grep -q "$library"; then
      continue
    fi

    missing=1
    break
  done

  if [[ "$missing" -eq 0 ]]; then
    return 0
  fi

  if ! command -v apt >/dev/null 2>&1 || ! command -v dpkg-deb >/dev/null 2>&1; then
    echo "Missing Playwright runtime libraries and apt/dpkg-deb are unavailable." >&2
    echo "Install libnspr4, libnss3, and libasound2 (or libasound2t64) manually." >&2
    exit 1
  fi

  mkdir -p "$DEB_CACHE_DIR"
  pushd "$DEB_CACHE_DIR" >/dev/null
  download_package "libnspr4"
  download_package "libnss3"
  if ! download_package "libasound2t64"; then
    download_package "libasound2"
  fi
  popd >/dev/null

  rm -rf "$LIB_CACHE_DIR"
  mkdir -p "$LIB_CACHE_DIR"
  dpkg-deb -x "$DEB_CACHE_DIR"/libnspr4_*_amd64.deb "$LIB_CACHE_DIR"
  dpkg-deb -x "$DEB_CACHE_DIR"/libnss3_*_amd64.deb "$LIB_CACHE_DIR"

  if compgen -G "$DEB_CACHE_DIR/libasound2t64_*_amd64.deb" >/dev/null; then
    dpkg-deb -x "$DEB_CACHE_DIR"/libasound2t64_*_amd64.deb "$LIB_CACHE_DIR"
  else
    dpkg-deb -x "$DEB_CACHE_DIR"/libasound2_*_amd64.deb "$LIB_CACHE_DIR"
  fi
}

main() {
  cd "$ROOT_DIR"
  ensure_browser_binaries
  ensure_linux_runtime_libraries
  export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  exec pnpm exec playwright "$@"
}

main "$@"
