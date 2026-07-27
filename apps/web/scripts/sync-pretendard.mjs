#!/usr/bin/env node
// Pretendard(가변 폰트, 동적 서브셋)를 node_modules 에서 public/fonts 로 복사한다.
//
// 왜 벤더링하는가: next.config.ts 의 CSP 가 `font-src 'self' data:` 라서 외부
// 폰트 CDN 을 쓸 수 없다. 동적 서브셋(92 청크)은 브라우저가 실제로 쓰이는
// 유니코드 범위만 내려받으므로, 단일 2MB variable 파일보다 훨씬 가볍다.
//
// 사용: node scripts/sync-pretendard.mjs [--check]
//   --check 를 주면 파일을 쓰지 않고 드리프트만 검사한다(CI 용).

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIR = path.join(
  PROJECT_ROOT,
  "node_modules",
  "pretendard",
  "dist",
  "web",
  "variable",
);
const SOURCE_CSS = path.join(SOURCE_DIR, "pretendardvariable-dynamic-subset.css");
const SOURCE_WOFF2_DIR = path.join(SOURCE_DIR, "woff2-dynamic-subset");

// woff2 는 정적 자산이므로 public/ 에, @font-face 선언은 소스 CSS 로 들어간다.
// globals.css 가 이 파일을 @import 하면 번들 CSS 에 인라인되어, 폰트 선언을
// 받아오기 위한 렌더 블로킹 요청이 한 번 줄어든다.
const TARGET_WOFF2_DIR = path.join(PROJECT_ROOT, "public", "fonts", "pretendard");
const TARGET_CSS = path.join(PROJECT_ROOT, "app", "(dashboard)", "pretendard-font.css");

const PUBLIC_WOFF2_URL = "/fonts/pretendard/";

const isCheckMode = process.argv.includes("--check");

/** 상대 url(./woff2-dynamic-subset/...) 을 절대 public 경로로 바꾼다. */
const rewriteCss = (css) =>
  css.replace(/url\(\.\/woff2-dynamic-subset\//g, `url(${PUBLIC_WOFF2_URL}`);

const hashBuffer = (buffer) => createHash("sha256").update(buffer).digest("hex");

const readDirSafe = async (dir) => {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
};

const main = async () => {
  let sourceCss;
  try {
    sourceCss = await readFile(SOURCE_CSS, "utf8");
  } catch {
    console.error(
      `[sync-pretendard] ${SOURCE_CSS} 를 찾을 수 없습니다. 먼저 \`pnpm install\` 을 실행하세요.`,
    );
    process.exit(1);
  }

  const nextCss = `/* 생성된 파일 — 직접 수정하지 말고 \`pnpm fonts:sync\` 를 실행하세요. */\n${rewriteCss(sourceCss)}`;
  const sourceFiles = (await readdir(SOURCE_WOFF2_DIR)).filter((name) =>
    name.endsWith(".woff2"),
  );

  if (sourceFiles.length === 0) {
    console.error("[sync-pretendard] 서브셋 woff2 파일이 없습니다.");
    process.exit(1);
  }

  if (isCheckMode) {
    const currentCss = await readFile(TARGET_CSS, "utf8").catch(() => null);
    const currentFiles = (await readDirSafe(TARGET_WOFF2_DIR)).filter((name) =>
      name.endsWith(".woff2"),
    );

    const drifted = currentCss !== nextCss || currentFiles.length !== sourceFiles.length;

    if (drifted) {
      console.error(
        "[sync-pretendard] public/fonts/pretendard 가 node_modules 와 다릅니다. `node scripts/sync-pretendard.mjs` 를 실행하세요.",
      );
      process.exit(1);
    }

    console.log("[sync-pretendard] 최신 상태입니다.");
    return;
  }

  await rm(TARGET_WOFF2_DIR, { recursive: true, force: true });
  await mkdir(TARGET_WOFF2_DIR, { recursive: true });

  let totalBytes = 0;
  for (const name of sourceFiles) {
    const buffer = await readFile(path.join(SOURCE_WOFF2_DIR, name));
    totalBytes += buffer.byteLength;
    await writeFile(path.join(TARGET_WOFF2_DIR, name), buffer);
  }

  await writeFile(TARGET_CSS, nextCss, "utf8");

  console.log(
    `[sync-pretendard] 서브셋 ${sourceFiles.length}개(${(totalBytes / 1024 / 1024).toFixed(1)}MB) → public/fonts/pretendard, @font-face CSS(${hashBuffer(Buffer.from(nextCss)).slice(0, 8)}) → app/(dashboard)/pretendard-font.css`,
  );
};

await main();
