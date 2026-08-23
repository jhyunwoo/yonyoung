import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  공개 라우트 번들 정책을 소스 레벨에서 고정한다.

  런타임 예산(tests/e2e/performance-budget.spec.ts)은 결과를 재고, 이 테스트는
  결과를 망가뜨리는 것으로 알려진 두 가지 원인을 직접 막는다. 빌드 없이 돌기 때문에
  잘못된 변경이 리뷰에 올라오기 전에 잡힌다.
*/

const PUBLIC_ROOT = path.resolve(__dirname, "../../../app/(home)");

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return collectSourceFiles(full);
    }
    return full.endsWith(".tsx") || full.endsWith(".ts") ? [full] : [];
  });
};

const publicSources = collectSourceFiles(PUBLIC_ROOT).map((file) => ({
  file: path.relative(PUBLIC_ROOT, file),
  source: readFileSync(file, "utf8"),
}));

describe("공개 라우트 번들 정책", () => {
  it("공개 라우트는 framer-motion 을 import 하지 않는다", () => {
    /*
      헤더가 모든 공개 페이지에 있어서 import 하나가 공개 번들 전체에 gzip 약 43KB 를
      얹는다. 등장·패럴랙스·오버레이 전환은 globals.css 와 아일랜드 두 개로 구현돼
      있다 — docs/performance-architecture.md 참고.
    */
    const offenders = publicSources
      .filter(({ source }) => /from\s+["']framer-motion["']/.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("공개 라우트의 Link 에 prefetch={true} 를 쓰지 않는다", () => {
    /*
      Partial Prefetching 이 켜져 있으면 같은 라우트를 가리키는 카드 수십 장이
      App Shell 하나를 공유한다. prefetch={true} 는 그 공유를 깨고 URL 별 런타임
      프리페치를 카드 수만큼 되살린다.
    */
    const offenders = publicSources
      .filter(({ source }) => /prefetch=\{true\}|prefetch=\{\s*true\s*\}/.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("공개 페이지는 Instant Navigation 계약을 선언한다", () => {
    /*
      예외:
        - `archive/page.tsx` 는 `/archive/records` 로 보내기만 하는 리다이렉트 자리라
          그릴 화면이 없다(next.config 의 redirects 와 짝을 이룬다).
        - `auth/**` 는 로그인 상태에 따라 목적지가 갈리는 라우트라 즉시 이동이 성립하지 않는다.
    */
    const REDIRECT_ONLY_PAGES = new Set(["archive/page.tsx"]);
    const pages = publicSources.filter(
      ({ file }) =>
        file.endsWith("page.tsx") &&
        !file.includes("auth/") &&
        !REDIRECT_ONLY_PAGES.has(file),
    );
    const missing = pages
      .filter(({ source }) => !/export const instant\s*=/.test(source))
      .map(({ file }) => file);

    // 선언이 있어야 빌드가 요청 시점 작업 유입을 막아 준다.
    expect(missing).toEqual([]);
  });
});
