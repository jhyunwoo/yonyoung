import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 대시보드 디자인 토큰의 WCAG 대비 계약.
 *
 * e2e(route-matrix.spec.ts)가 전 라우트 × 라이트/다크 × 2디바이스로 axe
 * color-contrast 를 돌리지만 몇 분이 걸린다. 토큰 자체의 대비는 순수 계산으로
 * 즉시 검증할 수 있으므로, 회귀를 여기서 먼저 잡는다.
 */

const GLOBALS_CSS = path.join("app", "(dashboard)", "globals.css");
const DASHBOARD_DIR = path.join("app", "(dashboard)");

type TokenMap = Record<string, string>;

/** globals.css 에서 특정 셀렉터 블록의 커스텀 프로퍼티를 추출한다. */
const readTokenBlock = (css: string, selector: string): TokenMap => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockMatch = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css);
  if (blockMatch === null) {
    throw new Error(`${selector} 블록을 globals.css 에서 찾지 못했습니다.`);
  }

  const tokens: TokenMap = {};
  const declarationPattern = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let declaration: RegExpExecArray | null;
  while ((declaration = declarationPattern.exec(blockMatch[1])) !== null) {
    tokens[declaration[1]] = declaration[2].toLowerCase();
  }

  return tokens;
};

const toChannel = (value: number): number => {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string): number => {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value.slice(0, 6);

  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return 0.2126 * toChannel(red) + 0.7152 * toChannel(green) + 0.0722 * toChannel(blue);
};

const contrastRatio = (foreground: string, background: string): number => {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
};

/** [전경 토큰, 배경 토큰, 최소 대비] — 텍스트는 4.5, 비텍스트 UI 는 3.0 */
const CONTRAST_MATRIX: readonly (readonly [string, string, number])[] = [
  // 본문 텍스트: 카드 위와 캔버스 위 양쪽에서 성립해야 한다.
  ["--ink", "--surface", 4.5],
  ["--ink", "--canvas", 4.5],
  ["--ink", "--canvas-soft", 4.5],
  ["--ink", "--surface-sunken", 4.5],
  ["--ink-secondary", "--surface", 4.5],
  ["--ink-secondary", "--canvas", 4.5],
  ["--ink-muted", "--surface", 4.5],
  ["--ink-muted", "--canvas", 4.5],
  ["--ink-muted", "--canvas-soft", 4.5],

  // 틴트된 컨테이너 안의 본문 텍스트.
  //
  // 이 조합들이 빠져 있으면 "선택된 카드"류 UI 에서 대비가 조용히 깨진다.
  // 실제로 재디자인 중 파란 단색 채움(bg-primary) 위에 어두운 보조 텍스트가
  // 남아 2.88:1 이 된 회귀가 e2e axe 에서 잡혔다. 그 계층을 여기서 고정한다.
  ["--ink", "--primary-soft", 4.5],
  ["--ink-secondary", "--primary-soft", 4.5],
  ["--ink-muted", "--primary-soft", 4.5],
  ["--ink", "--surface-raised", 4.5],
  ["--ink-muted", "--surface-raised", 4.5],
  ["--ink-secondary", "--surface-sunken", 4.5],
  ["--ink-muted", "--surface-sunken", 4.5],
  ["--ink-muted", "--danger-soft", 4.5],
  ["--ink-muted", "--success-soft", 4.5],
  ["--ink-muted", "--warning-soft", 4.5],

  // 액센트 · 상태 텍스트
  ["--primary-text", "--surface", 4.5],
  ["--primary-text", "--canvas", 4.5],
  ["--primary-text", "--primary-soft", 4.5],
  ["--danger-text", "--surface", 4.5],
  ["--danger-text", "--danger-soft", 4.5],
  ["--success-text", "--surface", 4.5],
  ["--success-text", "--success-soft", 4.5],
  ["--warning-text", "--surface", 4.5],
  ["--warning-text", "--warning-soft", 4.5],

  // 채움 버튼 위의 글자
  ["--on-primary", "--primary", 4.5],
  ["--on-primary", "--primary-active", 4.5],
  ["--on-primary", "--danger", 4.5],
  ["--ink-inverse", "--ink", 4.5],

  // 포커스 링 — 키보드 접근성의 핵심이라 WCAG 1.4.11 의 3:1 을 반드시 만족한다.
  ["--focus-ring", "--surface", 3],
  ["--focus-ring", "--canvas", 3],
  ["--focus-ring", "--surface-raised", 3],
];

// 의도적 트레이드오프: --hairline / --hairline-strong 은 WCAG 1.4.11 의 3:1 을
// 만족하지 않는다. DESIGN.md 는 "elevation by hairline"(무거운 그림자 대신
// 머리카락 같은 1px 선)을 브랜드의 핵심으로 규정하고, Notion 실제 인풋 테두리도
// #ddd(1.5:1)다. 3:1 테두리는 이 디자인 언어를 파괴한다.
// 대신 컨트롤의 식별 가능성은 (1) 3:1 을 넘는 포커스 링, (2) 인풋의 별도
// 배경 채움(--surface / --surface-sunken), (3) 항상 보이는 <label> 로 확보한다.
// axe 의 color-contrast 룰은 테두리를 검사하지 않으므로 e2e 매트릭스와도 무관하다.

const listDashboardSourceFiles = (): string[] => {
  const files: string[] = [];
  const walk = (targetPath: string): void => {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      const resolved = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        walk(resolved);
      } else if (/\.tsx?$/.test(entry.name)) {
        files.push(resolved);
      }
    }
  };
  walk(DASHBOARD_DIR);
  return files;
};

describe("dashboard design tokens", () => {
  const css = fs.readFileSync(GLOBALS_CSS, "utf8");
  const light = readTokenBlock(css, ":root");
  const dark = readTokenBlock(css, ".dark");

  it.each(["light", "dark"] as const)("%s 모드 토큰 대비를 만족한다", (mode) => {
    const tokens = mode === "light" ? light : { ...light, ...dark };

    const failures = CONTRAST_MATRIX.flatMap(([foreground, background, minimum]) => {
      const foregroundHex = tokens[foreground];
      const backgroundHex = tokens[background];

      if (foregroundHex === undefined || backgroundHex === undefined) {
        return [`${mode}: ${foreground} 또는 ${background} 토큰이 없습니다.`];
      }

      const ratio = contrastRatio(foregroundHex, backgroundHex);
      if (ratio >= minimum) {
        return [];
      }

      return [
        `${mode}: ${foreground}(${foregroundHex}) on ${background}(${backgroundHex}) = ${ratio.toFixed(2)}:1, 최소 ${minimum}:1 필요`,
      ];
    });

    expect(failures).toEqual([]);
  });

  it("다크 블록이 라이트의 모든 색 토큰을 재정의한다", () => {
    // 재정의를 빠뜨리면 다크 모드에서 라이트 색이 그대로 남아 대비가 무너진다.
    // 레이아웃 상수(--sidebar-*, --topbar-*)는 색이 아니므로 대상이 아니다.
    const missing = Object.keys(light).filter((token) => !(token in dark));
    expect(missing).toEqual([]);
  });

  it("--ink-faint 는 텍스트 색으로 쓰이지 않는다", () => {
    // 라이트 기준 #a39e98 은 흰 배경에서 2.66:1 로 본문 대비를 만족하지 못한다.
    // 아이콘/구분선 전용이며, 보조 텍스트는 --ink-muted 를 쓴다.
    const offenders = listDashboardSourceFiles().filter((file) =>
      /(?:^|[\s"'`:])text-ink-faint\b/.test(fs.readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
