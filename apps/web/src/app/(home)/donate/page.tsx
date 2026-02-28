import type { Metadata } from "next";
import { DEFAULT_SITE_SETTINGS } from "@repo/shared-api-contracts";
import { createPageMetadata } from "../../../lib/seo";
import { getPublicSiteSettings } from "../../../lib/public-api";
import PageTitleHero from "../components/page-title-hero";

export const metadata: Metadata = createPageMetadata({
  title: "후원 안내 | 연영회",
  description:
    "연영회 후원 안내, 후원 방법, 후원금 사용 내역, 문의 정보를 확인하세요.",
  path: "/donate",
  keywords: [
    "연영회 후원",
    "DONATE US",
    "연영회 후원 안내",
    "후원금 사용 내역",
  ],
});

export default async function DonatePage() {
  const siteSettings = await getPublicSiteSettings().catch(
    () => DEFAULT_SITE_SETTINGS,
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-300 px-4 md:px-8">
        <PageTitleHero
          title="후원 안내"
          description={
            <>
              연영회의 활동 후원해 주시면
              <br />
              더 좋은 사진과 전시로 보답하겠습니다.
            </>
          }
        />

        <section className="mx-auto max-w-200">
          <div className="mb-16">
            <h2 className="mb-6 border-b-2 border-[#2c3357] pb-2 text-[1.75rem] leading-[1.3] font-semibold text-[#2c3357] md:text-[2.5rem]">
              후원 안내
            </h2>
            <p className="text-base leading-[1.8] text-[#666666]">
              연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다.
              후원금은 전시회 개최, 장비 구매, 워크샵 운영 등에 사용됩니다.
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
                  <p className="mb-2 font-mono text-[1.1rem] text-[#666666]">
                    은행: {siteSettings.donateBankName}
                  </p>
                  <p className="mb-2 font-mono text-[1.1rem] text-[#666666]">
                    계좌번호: {siteSettings.donateAccountNumber}
                  </p>
                  <p className="font-mono text-[1.1rem] text-[#666666]">
                    예금주: {siteSettings.donateAccountHolder}
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.1)] md:p-8">
                <h3 className="mb-4 text-[1.8rem] leading-[1.4] font-semibold text-[#2c3357] md:text-[2rem]">
                  후원금 사용 내역
                </h3>
                <div className="grid gap-4">
                  <div className="rounded-[5px] border-l-4 border-[#2c3357] bg-white p-4">
                    <h4 className="mb-2 text-[1.1rem] leading-[1.4] font-medium text-[#2c3357]">
                      전시회 개최
                    </h4>
                    <p className="text-sm leading-[1.6] text-[#666666]">
                      갤러리 대관 및 전시 준비 비용
                    </p>
                  </div>
                  <div className="rounded-[5px] border-l-4 border-[#2c3357] bg-white p-4">
                    <h4 className="mb-2 text-[1.1rem] leading-[1.4] font-medium text-[#2c3357]">
                      장비 유지보수
                    </h4>
                    <p className="text-sm leading-[1.6] text-[#666666]">
                      카메라, 렌즈 등 촬영 장비 구매
                    </p>
                  </div>
                  <div className="rounded-[5px] border-l-4 border-[#2c3357] bg-white p-4">
                    <h4 className="mb-2 text-[1.1rem] leading-[1.4] font-medium text-[#2c3357]">
                      동아리 행사 운영비
                    </h4>
                    <p className="text-sm leading-[1.6] text-[#666666]">
                      사진 기술 교육 및 워크샵 비용
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16 p-8 rounded-xl shadow-md flex flex-col items-center justify-center text-sm text-neutral-600 gap-2">
            <p>
              후원해 주신 분들의 성함은 전시회에 특별히 감사의 말씀과 함께
              소개됩니다.
            </p>
            <p>작은 관심과 응원이 저희에게 큰 힘이 됩니다.</p>
            <p>
              후원금 사용 내역은 60기 운영진으로 연락주시면 열람하실 수
              있습니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
