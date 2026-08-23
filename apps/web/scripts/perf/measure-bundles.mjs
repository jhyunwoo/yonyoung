/*
  프리렌더된 HTML 이 실제로 부르는 스크립트를 기준으로 라우트별 초기 JS 를 잰다.

  빌드 로그의 크기 표기는 Next 16 에서 사라졌고, 청크 파일 전체를 더하면 그 라우트가
  받지 않는 것까지 포함된다. 그래서 `.next/server/app/**.html` 을 파싱해 그 페이지가
  실제로 참조하는 스크립트만 더한다.

  `noModule` 스크립트는 따로 센다 — 모던 브라우저는 받지 않으므로 실제 사용자 비용이
  아니다. 이걸 섞으면 공개 라우트 수치가 40KB 가까이 부풀려진다.

  사용: node scripts/perf/measure-bundles.mjs [.next 경로]
*/
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const NEXT_DIR = process.argv[2] ?? path.resolve("apps/web/.next");
const ROUTES = [
  ["/", "index.html"],
  ["/about", "about.html"],
  ["/about/photographers", "about/photographers.html"],
  ["/about/recruiting", "about/recruiting.html"],
  ["/archive/records", "archive/records.html"],
  ["/archive/records/act-1", "archive/records/act-1.html"],
  ["/archive/exhibitions", "archive/exhibitions.html"],
  ["/archive/exhibitions/exh-1", "archive/exhibitions/exh-1.html"],
  ["/linktree", "linktree.html"],
  ["/donate", "donate.html"],
  ["/dashboard", "dashboard.html"],
];

const sizeOf = (rel) => {
  const p = path.join(NEXT_DIR, rel.replace(/^\/_next\//, ""));
  try {
    const buf = fs.readFileSync(p);
    return { raw: buf.length, gz: zlib.gzipSync(buf, { level: 9 }).length };
  } catch {
    return null;
  }
};

const rows = [];
for (const [route, file] of ROUTES) {
  const htmlPath = path.join(NEXT_DIR, "server/app", file);
  if (!fs.existsSync(htmlPath)) {
    rows.push({ route, missing: true });
    continue;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const modern = new Set();
  const legacy = new Set();
  for (const m of html.matchAll(
    /<script[^>]*?src="(\/_next\/static\/[^"]+\.js)"([^>]*)>/g,
  )) {
    (/noModule/i.test(m[2]) ? legacy : modern).add(m[1]);
  }
  // preloaded module scripts (link rel=preload as=script) also count as initial
  for (const m of html.matchAll(
    /<link[^>]*?rel="preload"[^>]*?href="(\/_next\/static\/[^"]+\.js)"/g,
  )) {
    if (!legacy.has(m[1])) modern.add(m[1]);
  }
  const sum = (set) => {
    let raw = 0,
      gz = 0;
    for (const s of set) {
      const r = sizeOf(s);
      if (r) {
        raw += r.raw;
        gz += r.gz;
      }
    }
    return { rawKB: +(raw / 1024).toFixed(1), gzKB: +(gz / 1024).toFixed(1) };
  };
  const m = sum(modern);
  const l = sum(legacy);
  rows.push({
    route,
    modernScripts: modern.size,
    modernRawKB: m.rawKB,
    modernGzKB: m.gzKB,
    legacyGzKB: l.gzKB,
    htmlKB: +(fs.statSync(htmlPath).size / 1024).toFixed(1),
  });
}

const chunkDir = path.join(NEXT_DIR, "static/chunks");
const all = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) {
      const buf = fs.readFileSync(p);
      all.push({
        file: path.relative(chunkDir, p),
        rawKB: +(buf.length / 1024).toFixed(1),
        gzKB: +(zlib.gzipSync(buf, { level: 9 }).length / 1024).toFixed(1),
      });
    }
  }
};
if (fs.existsSync(chunkDir)) walk(chunkDir);
all.sort((a, b) => b.gzKB - a.gzKB);

console.log(
  JSON.stringify(
    {
      routes: rows,
      totalChunkGzKB: +all.reduce((s, c) => s + c.gzKB, 0).toFixed(1),
      largestChunks: all.slice(0, 12),
    },
    null,
    2,
  ),
);
