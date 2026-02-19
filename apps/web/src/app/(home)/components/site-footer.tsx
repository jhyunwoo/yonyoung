import Image from "next/image";

const infoLabelClass = "text-[0.85rem] font-bold uppercase text-[#999999]";
const infoContentClass = "break-all text-[0.9rem] leading-[1.6] text-[#cccccc]";

export default function SiteFooter() {
  return (
    <footer className="mt-16 bg-[#1a1a1a] pb-6 pt-12 text-white md:pb-8 md:pt-16" data-testid="public-footer">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="mb-6 border-b border-[#333333] pb-6 md:mb-8 md:pb-8">
          <div className="flex items-center gap-[0.6rem]">
            <div className="flex h-[1.92rem] items-center justify-center">
              <Image
                src="/yonyong-logo-white.png"
                alt="연영회 로고"
                width={40}
                height={40}
                unoptimized
                className="h-full w-auto object-contain"
              />
            </div>
            <div className="text-left text-[0.8rem] leading-[1.2] font-bold tracking-[-0.02em] text-white">
              <span className="block tracking-[-0.05em]">연세대학교 중앙사진동아리</span>
              연영회
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-5 lg:gap-6">
            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>오픈 카톡방</span>
              <a
                href="https://open.kakao.com/o/snVWZ4th"
                target="_blank"
                rel="noopener noreferrer"
                className={`${infoContentClass} transition-colors duration-300 hover:text-white`}
              >
                https://open.kakao.com/o/snVWZ4th
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>INSTAGRAM</span>
              <span className={infoContentClass}>@yonyongpage</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>E-mail</span>
              <a
                href="mailto:kimse0604@naver.com"
                className={`${infoContentClass} transition-colors duration-300 hover:text-white`}
              >
                kimse0604@naver.com
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>HP</span>
              <span className={infoContentClass}>010-6814-1800</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className={infoLabelClass}>주소</span>
              <span className={infoContentClass}>
                서울특별시 서대문구 연희로 50 연세대학교 대강당 nn호
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
