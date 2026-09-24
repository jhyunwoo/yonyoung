import { eq } from "drizzle-orm";
import { DEFAULT_SITE_SETTINGS } from "@yonyoung/contracts";
import type createDB from "../../lib/db";
import { siteSettings } from "../../platform/db/schema";
import type { SiteSettingsEntity } from "../../lib/services/types";

type Database = ReturnType<typeof createDB>;

// 사이트 설정은 행이 하나뿐인 싱글턴 테이블이다.
const SITE_SETTINGS_SINGLETON_ID = "default";

const normalizeInstagramId = (value: string): string =>
  value.trim().replace(/^@+/, "");

const toSiteSettingsEntity = (
  row: typeof siteSettings.$inferSelect | null,
): SiteSettingsEntity => {
  if (!row) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  return {
    footerOpenChatUrl: row.footerOpenChatUrl,
    footerInstagramId: normalizeInstagramId(row.footerInstagramId),
    footerEmail: row.footerEmail,
    footerPhone: row.footerPhone,
    footerAddress: row.footerAddress,
    donateBankName: row.donateBankName,
    donateAccountNumber: row.donateAccountNumber,
    donateAccountHolder: row.donateAccountHolder,
  };
};

export const createSiteSettingsRepository = (db: Database) => {
  const getSiteSettings = async (): Promise<SiteSettingsEntity> => {
    const row =
      (await db.query.siteSettings.findFirst({
        where: eq(siteSettings.id, SITE_SETTINGS_SINGLETON_ID),
      })) ?? null;
    return toSiteSettingsEntity(row);
  };

  return {
    getSiteSettings,

    async updateSiteSettings(
      input: Partial<SiteSettingsEntity>,
    ): Promise<SiteSettingsEntity> {
      const current = await getSiteSettings();
      const next: SiteSettingsEntity = {
        ...current,
        ...input,
      };

      next.footerInstagramId = normalizeInstagramId(next.footerInstagramId);
      const changedColumns: Partial<SiteSettingsEntity> = Object.fromEntries(
        (Object.keys(input) as (keyof SiteSettingsEntity)[])
          .filter((key) => input[key] !== undefined)
          .map((key) => [key, next[key]]),
      );

      await db
        .insert(siteSettings)
        .values({
          id: SITE_SETTINGS_SINGLETON_ID,
          footerOpenChatUrl: next.footerOpenChatUrl,
          footerInstagramId: next.footerInstagramId,
          footerEmail: next.footerEmail,
          footerPhone: next.footerPhone,
          footerAddress: next.footerAddress,
          donateBankName: next.donateBankName,
          donateAccountNumber: next.donateAccountNumber,
          donateAccountHolder: next.donateAccountHolder,
        })
        .onConflictDoUpdate({
          target: siteSettings.id,
          // 전달된 필드만 갱신한다. 읽은 값 전체를 되쓰면, 두 관리자가 서로 다른 항목을
          // 동시에 저장했을 때 나중 요청이 앞 요청의 변경을 옛 값으로 덮어쓴다.
          set: {
            ...changedColumns,
            updatedAt: new Date(),
          },
        });

      return getSiteSettings();
    },
  };
};

export type SiteSettingsRepository = ReturnType<
  typeof createSiteSettingsRepository
>;
