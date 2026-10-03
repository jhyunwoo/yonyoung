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

    /**
     * 설정을 저장하고, 같은 트랜잭션 안에서 읽은 직전·직후 값으로 실제로 바뀐 항목을 돌려준다.
     *
     * 읽기와 쓰기를 따로 하면 두 관리자가 동시에 저장할 때 감사 로그가 실제로 덮어쓴 값과
     * 다른 "이전 값"을 기준으로 계산된다. D1 batch는 하나의 트랜잭션으로 순서대로 실행되므로
     * 직전 조회 → upsert → 직후 조회를 묶으면 기록이 커밋된 전이와 정확히 일치한다.
     */
    async updateSiteSettings(input: Partial<SiteSettingsEntity>): Promise<{
      settings: SiteSettingsEntity;
      changedFields: (keyof SiteSettingsEntity)[];
    }> {
      // 행이 아직 없을 때 삽입할 기본값을 만들기 위한 조회다(감사 기준으로는 쓰지 않는다).
      const current = await getSiteSettings();
      const next: SiteSettingsEntity = {
        ...current,
        ...input,
      };

      next.footerInstagramId = normalizeInstagramId(next.footerInstagramId);
      const inputKeys = (
        Object.keys(input) as (keyof SiteSettingsEntity)[]
      ).filter((key) => input[key] !== undefined);
      const changedColumns: Partial<SiteSettingsEntity> = Object.fromEntries(
        inputKeys.map((key) => [key, next[key]]),
      );

      const selectRow = () =>
        db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.id, SITE_SETTINGS_SINGLETON_ID))
          .limit(1);

      const [beforeRows, , afterRows] = await db.batch([
        selectRow(),
        db
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
          }),
        selectRow(),
      ]);

      const before = toSiteSettingsEntity(beforeRows[0] ?? null);
      const settings = toSiteSettingsEntity(afterRows[0] ?? null);
      return {
        settings,
        changedFields: inputKeys.filter((key) => before[key] !== settings[key]),
      };
    },
  };
};

export type SiteSettingsRepository = ReturnType<
  typeof createSiteSettingsRepository
>;
