import type { Metadata } from "next";
import { createPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "DONATE US | 연영회",
  description: "연영회 후원 안내, 후원 방법, 후원금 사용 내역, 문의 정보를 확인하세요.",
  path: "/donate",
  keywords: ["연영회 후원", "DONATE US", "연영회 후원 안내", "후원금 사용 내역"],
});

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <section className="mb-16 border-b border-[#bfbfbf] py-8 text-center md:py-16">
          <h1 className="mb-4 text-[2rem] leading-[1.2] font-bold text-[#2c3357] md:text-[3rem]">
            DONATE US
          </h1>
          <p className="mb-4 text-[1.2rem] text-[#666666]">연영회 후원 안내</p>
        </section>

        <section className="mx-auto max-w-[800px]">
          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-[#2c3357] pb-2 text-[1.75rem] leading-[1.3] font-semibold text-[#2c3357] md:text-[2.5rem]">
              후원 안내
            </h2>
            <p className="text-base leading-[1.8] text-[#666666]">
              연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다. 후원금은
              전시회 개최, 장비 구매, 워크샵 운영 등에 사용됩니다.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-[#2c3357] pb-2 text-[1.75rem] leading-[1.3] font-semibold text-[#2c3357] md:text-[2.5rem]">
              후원 방법
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-lg bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] md:p-8">
                <h3 className="mb-4 text-[1.8rem] leading-[1.4] font-semibold text-[#2c3357] md:text-[2rem]">
                  계좌 이체
                </h3>
                <div className="mt-4 rounded-[5px] border border-[#e5e7eb] bg-white p-6">
                  <p className="mb-2 font-mono text-[1.1rem] text-[#666666]">은행: 예시은행</p>
                  <p className="mb-2 font-mono text-[1.1rem] text-[#666666]">
                    계좌번호: 123-456-789012
                  </p>
                  <p className="font-mono text-[1.1rem] text-[#666666]">예금주: 연영회</p>
                </div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] md:p-8">
                <h3 className="mb-4 text-[1.8rem] leading-[1.4] font-semibold text-[#2c3357] md:text-[2rem]">
                  온라인 후원
                </h3>
                <p className="text-base leading-[1.8] text-[#666666]">
                  온라인 후원 시스템을 통해 후원하실 수 있습니다.
                </p>
                <button
                  type="button"
                  className="mt-4 cursor-pointer rounded-[5px] border-none bg-[#2c3357] px-8 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-[#1a2340]"
                >
                  후원하기
                </button>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-[#2c3357] pb-2 text-[1.75rem] leading-[1.3] font-semibold text-[#2c3357] md:text-[2.5rem]">
              후원금 사용 내역
            </h2>
            <div className="grid gap-6">
              <div className="rounded-[5px] border-l-4 border-[#2c3357] bg-white p-6">
                <h4 className="mb-2 text-[1.5rem] leading-[1.4] font-medium text-[#2c3357]">
                  전시회 개최
                </h4>
                <p className="text-base leading-[1.8] text-[#666666]">
                  갤러리 대관 및 전시 준비 비용
                </p>
              </div>
              <div className="rounded-[5px] border-l-4 border-[#2c3357] bg-white p-6">
                <h4 className="mb-2 text-[1.5rem] leading-[1.4] font-medium text-[#2c3357]">
                  장비 구매
                </h4>
                <p className="text-base leading-[1.8] text-[#666666]">
                  카메라, 렌즈 등 촬영 장비 구매
                </p>
              </div>
              <div className="rounded-[5px] border-l-4 border-[#2c3357] bg-white p-6">
                <h4 className="mb-2 text-[1.5rem] leading-[1.4] font-medium text-[#2c3357]">
                  워크샵 운영
                </h4>
                <p className="text-base leading-[1.8] text-[#666666]">
                  사진 기술 교육 및 워크샵 비용
                </p>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-[#2c3357] pb-2 text-[1.75rem] leading-[1.3] font-semibold text-[#2c3357] md:text-[2.5rem]">
              문의
            </h2>
            <p className="text-base leading-[1.8] text-[#666666]">
              후원 관련 문의사항이 있으시면 언제든지 연락주세요.
            </p>
            <div className="mt-4 rounded-lg border border-[#e5e7eb] bg-white p-6 md:p-8">
              <p className="mb-2 text-[1.1rem] text-[#666666]">이메일: donate@yeonyeonghoe.com</p>
              <p className="text-[1.1rem] text-[#666666]">전화: 010-0000-0000</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
