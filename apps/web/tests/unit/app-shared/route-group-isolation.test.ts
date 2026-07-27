import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * (home) 과 (dashboard) 의 스타일 격리 계약.
 *
 * 대시보드 재디자인은 공개 사이트를 시각적으로 바꿔서는 안 된다. 두 그룹은
 * root layout 과 globals.css 가 분리돼 있어 구조적으로 안전하지만, 실수로
 * 대시보드 토큰 유틸이나 폰트를 (home) 에 끌어다 쓰는 것을 여기서 막는다.
 */

const HOME_DIR = path.join("app", "(home)");
const DASHBOARD_DIR = path.join("app", "(dashboard)");

/** (home) 에 등장하면 안 되는 대시보드 전용 토큰 유틸 · 자산 */
const DASHBOARD_ONLY_MARKERS: readonly RegExp[] = [
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:canvas|surface|ink|hairline|primary-soft|primary-text|primary-hairline|danger-soft|success-soft|warning-soft)\b/,
  /\bshadow-(?:soft|elevated)\b/,
  /\btext-(?:display-1|display-2|h1|h2|h3|title|body-sm|eyebrow)\b/,
  /\bdash-prose\b/,
  /fonts\/pretendard/,
];

const listSourceFiles = (root: string): string[] => {
  const files: string[] = [];
  const walk = (targetPath: string): void => {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      const resolved = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        walk(resolved);
      } else if (/\.(?:tsx?|css)$/.test(entry.name)) {
        files.push(resolved);
      }
    }
  };
  walk(root);
  return files;
};

describe("route group style isolation", () => {
  it("(home) 은 대시보드 전용 토큰이나 폰트를 쓰지 않는다", () => {
    const violations = listSourceFiles(HOME_DIR).flatMap((file) => {
      const source = fs.readFileSync(file, "utf8");
      return DASHBOARD_ONLY_MARKERS.filter((marker) => marker.test(source)).map(
        (marker) => `${file}: ${marker.source}`,
      );
    });

    expect(violations).toEqual([]);
  });

  it("두 그룹은 서로의 globals.css 를 import 하지 않는다", () => {
    // 주석에서 상대 그룹을 언급하는 것은 허용하고, 실제 import 만 잡는다.
    const importPattern = (group: string): RegExp =>
      new RegExp(`(?:@import|^import)\\s+["'][^"']*\\(${group}\\)/globals\\.css`, "m");

    const crossImports = [
      ...listSourceFiles(HOME_DIR).filter((file) =>
        importPattern("dashboard").test(fs.readFileSync(file, "utf8")),
      ),
      ...listSourceFiles(DASHBOARD_DIR).filter((file) =>
        importPattern("home").test(fs.readFileSync(file, "utf8")),
      ),
    ];

    expect(crossImports).toEqual([]);
  });

  it("(home) 은 대시보드 컴포넌트를 import 하지 않는다", () => {
    const offenders = listSourceFiles(HOME_DIR).filter((file) =>
      /from\s+["']@\/app\/\(dashboard\)\//.test(fs.readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
