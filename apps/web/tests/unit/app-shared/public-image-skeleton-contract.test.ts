import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
  공개 라우트의 이미지에 로딩 스켈레톤이 빠지지 않았는지 소스 레벨에서 고정한다.

  스켈레톤은 `[data-image-skeleton]` 프레임에 CSS 가 그리고, 아일랜드 하나가
  로드가 끝난 프레임에 `data-image-loaded` 를 붙여 끈다(globals.css 와
  `_components/image-skeleton-observer.tsx` 참고). 새 이미지를 추가하면서 프레임
  표시를 빠뜨리면 그 자리만 빈 상자로 남으므로 여기서 잡는다.
*/

const PUBLIC_ROOT = path.resolve(__dirname, "../../../app/(home)");

/*
  스켈레톤을 붙이지 않는 자리와 그 이유.
  새로 넣을 때는 "왜 이 이미지에는 필요 없는가"를 여기에 적는다.
*/
const EXEMPT_FILES = new Map([
  [
    path.join("_components", "photo-lightbox.tsx"),
    "확대 보기는 프레임 자체가 사진 크기라 자체 스켈레톤을 이미 갖고 있다",
  ],
  [
    path.join("_components", "photo-preload-images.tsx"),
    "화면 밖 1px 프리로더라 보이지 않는다",
  ],
  [
    path.join("_components", "site-footer.tsx"),
    "로컬 /public 로고다. 투명 PNG 라 뒤의 스켈레톤이 비쳐 보이고, 변환 없이 즉시 뜬다",
  ],
]);

const collectSourceFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return collectSourceFiles(full);
    }
    return full.endsWith(".tsx") ? [full] : [];
  });
};

const countMatches = (source: string, pattern: RegExp) =>
  source.match(pattern)?.length ?? 0;

const publicSources = collectSourceFiles(PUBLIC_ROOT).map((file) => ({
  file: path.relative(PUBLIC_ROOT, file),
  source: readFileSync(file, "utf8"),
}));

describe("공개 라우트 이미지 스켈레톤 계약", () => {
  it("공개 이미지는 모두 data-image-skeleton 프레임 안에 있다", () => {
    const offenders = publicSources
      .filter(({ file }) => !EXEMPT_FILES.has(file))
      .map(({ file, source }) => ({
        file,
        images: countMatches(source, /<Image\b/g),
        frames: countMatches(source, /data-image-skeleton\b/g),
      }))
      .filter(({ images, frames }) => images > frames);

    expect(offenders).toEqual([]);
  });

  it("스켈레톤 프레임은 하이드레이션 경고를 끈다", () => {
    /*
      아일랜드는 스트리밍 콘텐츠가 하이드레이션되기 전에 data-image-loaded 를 붙일 수
      있다. React 는 서버 HTML 에 없던 속성을 불일치로 잡으므로, 프레임마다
      suppressHydrationWarning 이 필요하다(레이아웃의 theme-init.js 와 같은 이유).
    */
    const offenders = publicSources
      // 아일랜드 자신도 선택자로 이 이름을 쓴다. 프레임을 그리는 파일만 본다
      .filter(({ file, source }) => !EXEMPT_FILES.has(file) && /<Image\b/.test(source))
      .map(({ file, source }) => ({
        file,
        frames: countMatches(source, /data-image-skeleton\b/g),
        suppressed: countMatches(source, /suppressHydrationWarning\b/g),
      }))
      .filter(({ frames, suppressed }) => frames > suppressed);

    expect(offenders).toEqual([]);
  });

  it("면제 목록은 실제로 이미지를 그리는 파일만 담는다", () => {
    // 파일이 사라지거나 이미지가 빠졌는데 면제만 남는 상황을 막는다
    const stale = [...EXEMPT_FILES.keys()].filter((file) => {
      const entry = publicSources.find((candidate) => candidate.file === file);
      return entry === undefined || countMatches(entry.source, /<Image\b/g) === 0;
    });

    expect(stale).toEqual([]);
  });
});
