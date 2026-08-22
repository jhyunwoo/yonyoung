#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB_CACHE_DIR="$ROOT_DIR/.cache/playwright-libs"
DEB_CACHE_DIR="$ROOT_DIR/.cache/playwright-debs"

# .deb 파일명과 라이브러리 경로가 아키텍처마다 다르다(amd64/x86_64-linux-gnu,
# arm64/aarch64-linux-gnu). CI는 amd64지만 개발 머신은 arm64일 수 있다.
DEB_ARCH="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
case "$DEB_ARCH" in
  arm64) LIB_TRIPLET="aarch64-linux-gnu" ;;
  *) LIB_TRIPLET="x86_64-linux-gnu" ;;
esac
LIB_DIR="$LIB_CACHE_DIR/usr/lib/$LIB_TRIPLET"

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
  extract_package() {
    local package_name="$1"
    if ! compgen -G "$DEB_CACHE_DIR/${package_name}_*_${DEB_ARCH}.deb" >/dev/null; then
      return 1
    fi
    dpkg-deb -x "$DEB_CACHE_DIR/${package_name}"_*_"${DEB_ARCH}".deb "$LIB_CACHE_DIR"
  }

  extract_package "libnspr4" || {
    echo "Failed to obtain libnspr4 for $DEB_ARCH." >&2
    exit 1
  }
  extract_package "libnss3" || {
    echo "Failed to obtain libnss3 for $DEB_ARCH." >&2
    exit 1
  }
  extract_package "libasound2t64" || extract_package "libasound2" || {
    echo "Failed to obtain libasound2 for $DEB_ARCH." >&2
    exit 1
  }
}

main() {
  cd "$ROOT_DIR"
  ensure_browser_binaries
  ensure_linux_runtime_libraries
  export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  exec pnpm exec playwright "$@"
}

main "$@"
