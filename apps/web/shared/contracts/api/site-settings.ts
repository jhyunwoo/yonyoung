import { z } from "zod";

const donateAccountNumberRegex = /^[0-9-]+$/;

export const apiSiteSettingsSchema = z.object({
  footerOpenChatUrl: z.url(),
  footerInstagramId: z.string(),
  footerEmail: z.string().email(),
  footerPhone: z.string(),
  footerAddress: z.string(),
  donateBankName: z.string(),
  donateAccountNumber: z
    .string()
    .trim()
    .max(50, { message: "계좌번호는 최대 50자까지 입력할 수 있습니다." })
    .regex(donateAccountNumberRegex, {
      message: "계좌번호는 숫자와 -만 입력할 수 있습니다.",
    }),
  donateAccountHolder: z.string(),
});

export type ApiSiteSettings = z.infer<typeof apiSiteSettingsSchema>;

export const apiUpdateSiteSettingsInputSchema = apiSiteSettingsSchema.partial();

export type ApiUpdateSiteSettingsInput = Partial<ApiSiteSettings>;

export const DEFAULT_SITE_SETTINGS: ApiSiteSettings = {
  footerOpenChatUrl: "https://open.kakao.com/o/snVWZ4th",
  footerInstagramId: "yonyongpage",
  footerEmail: "kimse0604@naver.com",
  footerPhone: "010-6814-1800",
  footerAddress: "서울특별시 서대문구 연희로 50 연세대학교 대강당 nn호",
  donateBankName: "예시은행",
  donateAccountNumber: "123-456-789012",
  donateAccountHolder: "연영회",
};
