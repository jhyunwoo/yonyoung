import type { Metadata } from "next";
import Image from "next/image";
import { listPublicSupporters, safeList } from "../../../../lib/public-api";
import { shouldUseUnoptimizedImage } from "../../../../lib/image-utils";
import { createPageMetadata } from "../../../../lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "서포터즈 | 연영회",
  description: "연영회의 활동과 전시를 함께 만들어가는 서포터즈를 소개합니다.",
  path: "/archive/supporters",
  keywords: ["연영회 서포터즈", "연영회 후원사", "사진 동아리 파트너"],
});

export default async function ArchiveSupportersPage() {
  const supporters = await safeList(listPublicSupporters, []);

  return (
    <div className="min-h-screen bg-white pt-[100px] md:pt-[120px]">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <header className="mb-12 text-center md:mb-20">
          <h1 className="mb-4 text-[2rem] font-normal tracking-[0.05em] text-black md:text-[3rem]">
            서포터즈
          </h1>
        </header>

        <div className="flex min-h-[300px] items-center justify-center">
          {supporters.length === 0 ? (
            <div className="w-full border border-dashed border-[#cccccc] px-6 py-10 text-center text-[1.2rem] text-[#999999] md:w-auto md:px-32 md:py-16">
              준비 중입니다.
            </div>
          ) : (
            <div
              className="grid w-full grid-cols-4 gap-6 max-[1024px]:grid-cols-2 max-[768px]:grid-cols-1 max-[768px]:gap-4"
              data-testid="archive-supporters-grid"
            >
              {supporters.map((supporter) => (
                <a
                  key={supporter.id}
                  href={supporter.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-3 no-underline"
                  data-testid={`archive-supporter-card-${supporter.id}`}
                >
                  <div className="relative aspect-[3/2] w-full overflow-hidden border border-[#f0f0f0] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                    <Image
                      src={supporter.logoUrl}
                      alt={supporter.name}
                      fill
                      unoptimized={shouldUseUnoptimizedImage(supporter.logoUrl)}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="m-0 text-center text-[0.95rem] font-semibold text-[#2c3357]">
                    {supporter.name}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
