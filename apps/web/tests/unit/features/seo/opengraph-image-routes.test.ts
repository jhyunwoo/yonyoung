import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_SEO } from "@/features/seo/metadata/page-seo";
import { createPageMetadata } from "@/features/seo/metadata/seo";

/**
 * Open Graph 이미지는 세그먼트별 `opengraph-image.tsx` 파일 컨벤션으로 제공한다.
 * 여기서 그 컨벤션이 실제로 동작하기 위한 전제들을 고정한다.
 */

const HOME_DIR = path.join("app", "(home)");
const DASHBOARD_DIR = path.join("app", "(dashboard)");

const listOpenGraphImageFiles = (root: string): string[] => {
  const files: string[] = [];
  const walk = (targetPath: string): void => {
    for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
      const resolved = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        walk(resolved);
      } else if (entry.name === "opengraph-image.tsx") {
        files.push(resolved);
      }
    }
  };
  walk(root);
  return files;
};

/** `app/(home)/about/photographers/opengraph-image.tsx` → `/about/photographers` */
const toRoutePath = (filePath: string): string => {
  const segments = filePath
    .split(path.sep)
    .slice(1, -1)
    .filter((segment) => !/^\(.+\)$/.test(segment));

  return `/${segments.join("/")}`;
};

describe("opengraph-image 라우트", () => {
  it("(home) 루트에 기본 카드가 있어 모든 공개 페이지가 상속받는다", () => {
    expect(fs.existsSync(path.join(HOME_DIR, "opengraph-image.tsx"))).toBe(true);
  });

  // (home) 과 (dashboard) 는 둘 다 URL 루트에 매핑되므로, 양쪽에 루트 opengraph-image 를
  // 두면 /opengraph-image 가 충돌해 빌드가 깨진다. 대시보드는 관리자 전용이라 필요 없다.
  it("(dashboard) 루트에는 opengraph-image 를 두지 않는다", () => {
    expect(fs.existsSync(path.join(DASHBOARD_DIR, "opengraph-image.tsx"))).toBe(false);
  });

  it("정적 페이지의 카드는 자기 경로와 같은 PAGE_SEO 항목을 쓴다", () => {
    const mismatches = listOpenGraphImageFiles(HOME_DIR)
      // 동적 세그먼트는 게시물 데이터에서 문구를 만들므로 PAGE_SEO 경로와 대응하지 않는다.
      .filter((file) => !file.includes("["))
      .flatMap((file) => {
        const source = fs.readFileSync(file, "utf8");
        const key = /PAGE_SEO\.(\w+)/.exec(source)?.[1];
        if (!key) {
          return [`${file}: PAGE_SEO 를 참조하지 않는다`];
        }

        const entry = PAGE_SEO[key as keyof typeof PAGE_SEO];
        const routePath = toRoutePath(file);
        return entry?.path === routePath
          ? []
          : [`${file}: PAGE_SEO.${key}.path=${entry?.path} !== ${routePath}`];
      });

    expect(mismatches).toEqual([]);
  });
});

describe("createPageMetadata", () => {
  // openGraph.images 나 twitter.images 가 채워져 있으면 Next.js 가 파일 컨벤션으로 만든
  // 이미지를 무시한다. 비어 있어야 세그먼트별 카드가 실제로 <head> 에 들어간다.
  it("이미지 필드를 비워 두어 파일 컨벤션이 이기게 한다", () => {
    const metadata = createPageMetadata(PAGE_SEO.about);

    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).not.toHaveProperty("images");
  });

  it("canonical 과 openGraph.url 은 사이트 origin 기준 절대 URL이다", () => {
    const metadata = createPageMetadata(PAGE_SEO.archiveRecords);

    expect(metadata.alternates?.canonical?.toString()).toContain("/archive/records");
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });
});
