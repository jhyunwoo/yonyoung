import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import createDB from "../db";
import {
  activities,
  activityImages,
  exhibitions,
  exhibitionImages,
  generations,
  linktree,
  linktreeItems,
  supporters,
  user,
} from "../db/schema";
import {
  ActivityEntity,
  ActivityImageEntity,
  DataService,
  ExhibitionEntity,
  ExhibitionImageEntity,
  LinktreeEntity,
  LinktreeItemEntity,
} from "./types";

/**
 * mapActivitiesWithImages의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param db 함수 로직에서 사용하는 입력값입니다.
 * @param rows 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mapActivitiesWithImages = async (
  db: ReturnType<typeof createDB>,
  rows: (typeof activities.$inferSelect)[],
): Promise<ActivityEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map(/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (row) => row.id);
  const imageRows = await db
    .select()
    .from(activityImages)
    .where(inArray(activityImages.activityId, ids))
    .orderBy(asc(activityImages.sortOrder));

  const imageMap = new Map<string, ActivityImageEntity[]>();
  for (const imageRow of imageRows) {
    const current = imageMap.get(imageRow.activityId) ?? [];
    current.push(imageRow);
    imageMap.set(imageRow.activityId, current);
  }

  return rows.map(/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (row) => ({
    ...row,
    detailImages: imageMap.get(row.id) ?? [],
  }));
};

/**
 * mapExhibitionsWithImages의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param db 함수 로직에서 사용하는 입력값입니다.
 * @param rows 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mapExhibitionsWithImages = async (
  db: ReturnType<typeof createDB>,
  rows: (typeof exhibitions.$inferSelect)[],
): Promise<ExhibitionEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map(/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (row) => row.id);
  const imageRows = await db
    .select()
    .from(exhibitionImages)
    .where(inArray(exhibitionImages.exhibitionId, ids))
    .orderBy(asc(exhibitionImages.sortOrder));

  const imageMap = new Map<string, ExhibitionImageEntity[]>();
  for (const imageRow of imageRows) {
    const current = imageMap.get(imageRow.exhibitionId) ?? [];
    current.push(imageRow);
    imageMap.set(imageRow.exhibitionId, current);
  }

  return rows.map(/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (row) => ({
    ...row,
    detailImages: imageMap.get(row.id) ?? [],
  }));
};

/**
 * mapLinktreesWithItems의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
 * @param db 함수 로직에서 사용하는 입력값입니다.
 * @param rows 함수 로직에서 사용하는 입력값입니다.
 * @returns 비동기 처리 결과를 Promise로 반환합니다.
 * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
 */
const mapLinktreesWithItems = async (
  db: ReturnType<typeof createDB>,
  rows: (typeof linktree.$inferSelect)[],
): Promise<LinktreeEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map(/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (row) => row.id);
  const itemRows = await db
    .select()
    .from(linktreeItems)
    .where(inArray(linktreeItems.linktreeId, ids));

  const itemMap = new Map<string, LinktreeItemEntity[]>();
  for (const item of itemRows) {
    const current = itemMap.get(item.linktreeId) ?? [];
    current.push(item);
    itemMap.set(item.linktreeId, current);
  }

  return rows.map(/** rows.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param row 함수 로직에서 사용하는 입력값입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (row) => ({
    ...row,
    items: itemMap.get(row.id) ?? [],
  }));
};

/**
 * createDbDataService 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
 * @param database 처리 대상 데이터입니다.
 * @returns 처리 결과 값을 반환합니다.
 * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
 */
export const createDbDataService = (database: D1Database): DataService => {
  const db = createDB(database);

  return {
        /**
     * listGenerations의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async listGenerations() {
      return db.select().from(generations).orderBy(asc(generations.sortOrder));
    },
        /**
     * createGeneration 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async createGeneration(input) {
      const id = crypto.randomUUID();
      await db.insert(generations).values({
        id,
        name: input.name,
        sortOrder: input.sortOrder,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      return (await db.query.generations.findFirst({
        where: eq(generations.id, id),
      }))!;
    },
        /**
     * getGenerationById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async getGenerationById(id) {
      return (
        (await db.query.generations.findFirst({
          where: eq(generations.id, id),
        })) ?? null
      );
    },
        /**
     * updateGeneration 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateGeneration(id, input) {
      const exists = await db.query.generations.findFirst({
        where: eq(generations.id, id),
      });
      if (!exists) {
        return null;
      }

      await db
        .update(generations)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          ...(input.startDate !== undefined
            ? { startDate: new Date(input.startDate) }
            : {}),
          ...(input.endDate !== undefined
            ? { endDate: new Date(input.endDate) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(generations.id, id));

      return (
        (await db.query.generations.findFirst({
          where: eq(generations.id, id),
        })) ?? null
      );
    },
        /**
     * deleteGeneration 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteGeneration(id) {
      const exists = await db.query.generations.findFirst({
        where: eq(generations.id, id),
      });
      if (!exists) {
        return false;
      }
      await db.delete(generations).where(eq(generations.id, id));
      return true;
    },

        /**
     * listActivities의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    async listActivities() {
      const rows = await db
        .select()
        .from(activities)
        .orderBy(asc(activities.activityDate));
      return mapActivitiesWithImages(db, rows);
    },
        /**
     * listPublicActivities의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 공개 화면 렌더링 성능을 위해 정렬을 DB에서 수행합니다.
     */
    async listPublicActivities() {
      const rows = await db
        .select()
        .from(activities)
        .orderBy(desc(activities.activityDate));
      return mapActivitiesWithImages(db, rows);
    },
        /**
     * createActivity 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async createActivity(input) {
      const id = crypto.randomUUID();
      await db.insert(activities).values({
        id,
        title: input.title,
        description: input.description,
        activityDate: new Date(input.activityDate),
        coverImageUrl: input.coverImageUrl,
        generationId: input.generationId,
      });
      return (await this.getActivityById(id))!;
    },
        /**
     * getActivityById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async getActivityById(id) {
      const row = await db.query.activities.findFirst({
        where: eq(activities.id, id),
      });
      if (!row) {
        return null;
      }
      const images = await db
        .select()
        .from(activityImages)
        .where(eq(activityImages.activityId, id))
        .orderBy(asc(activityImages.sortOrder));
      return {
        ...row,
        detailImages: images,
      };
    },
        /**
     * updateActivity 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateActivity(id, input) {
      const exists = await db.query.activities.findFirst({
        where: eq(activities.id, id),
      });
      if (!exists) {
        return null;
      }

      await db
        .update(activities)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.activityDate !== undefined
            ? { activityDate: new Date(input.activityDate) }
            : {}),
          ...(input.coverImageUrl !== undefined
            ? { coverImageUrl: input.coverImageUrl }
            : {}),
          ...(input.generationId !== undefined
            ? { generationId: input.generationId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(activities.id, id));

      return this.getActivityById(id);
    },
        /**
     * deleteActivity 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteActivity(id) {
      const exists = await db.query.activities.findFirst({
        where: eq(activities.id, id),
      });
      if (!exists) {
        return false;
      }
      await db.delete(activities).where(eq(activities.id, id));
      return true;
    },
        /**
     * addActivityImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @param activityId 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async addActivityImage(activityId, input) {
      const parent = await db.query.activities.findFirst({
        where: eq(activities.id, activityId),
      });
      if (!parent) {
        return null;
      }

      const id = crypto.randomUUID();
      await db.insert(activityImages).values({
        id,
        activityId,
        imageUrl: input.imageUrl,
        sortOrder: input.sortOrder,
      });
      return (
        (await db.query.activityImages.findFirst({
          where: eq(activityImages.id, id),
        })) ?? null
      );
    },
        /**
     * updateActivityImage 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param activityId 대상을 식별하기 위한 ID 값입니다.
     * @param imageId 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateActivityImage(activityId, imageId, input) {
      const exists = await db.query.activityImages.findFirst({
        where: and(
          eq(activityImages.id, imageId),
          eq(activityImages.activityId, activityId),
        ),
      });
      if (!exists) {
        return null;
      }

      await db
        .update(activityImages)
        .set({
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(activityImages.id, imageId),
            eq(activityImages.activityId, activityId),
          ),
        );

      return (
        (await db.query.activityImages.findFirst({
          where: eq(activityImages.id, imageId),
        })) ?? null
      );
    },
        /**
     * deleteActivityImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param activityId 대상을 식별하기 위한 ID 값입니다.
     * @param imageId 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteActivityImage(activityId, imageId) {
      const exists = await db.query.activityImages.findFirst({
        where: and(
          eq(activityImages.id, imageId),
          eq(activityImages.activityId, activityId),
        ),
      });
      if (!exists) {
        return false;
      }
      await db
        .delete(activityImages)
        .where(
          and(
            eq(activityImages.id, imageId),
            eq(activityImages.activityId, activityId),
          ),
        );
      return true;
    },

        /**
     * listSupporters의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async listSupporters() {
      return db.select().from(supporters).orderBy(asc(supporters.expiresAt));
    },
        /**
     * listPublicSupporters의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @param nowMs 기준 시각(Unix epoch ms)입니다.
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 공개 화면 노출 우선순위(유효 후원사 우선)를 DB 정렬로 처리합니다.
     */
    async listPublicSupporters(nowMs) {
      const activePriority = sql<number>`case when ${supporters.expiresAt} >= ${nowMs} then 1 else 0 end`;
      return db
        .select()
        .from(supporters)
        .orderBy(desc(activePriority), asc(supporters.expiresAt));
    },
        /**
     * createSupporter 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async createSupporter(input) {
      const id = crypto.randomUUID();
      await db.insert(supporters).values({
        id,
        name: input.name,
        link: input.link,
        logoUrl: input.logoUrl,
        expiresAt: new Date(input.expiresAt),
      });
      return (await db.query.supporters.findFirst({
        where: eq(supporters.id, id),
      }))!;
    },
        /**
     * getSupporterById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async getSupporterById(id) {
      return (
        (await db.query.supporters.findFirst({
          where: eq(supporters.id, id),
        })) ?? null
      );
    },
        /**
     * updateSupporter 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateSupporter(id, input) {
      const exists = await db.query.supporters.findFirst({
        where: eq(supporters.id, id),
      });
      if (!exists) {
        return null;
      }

      await db
        .update(supporters)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.link !== undefined ? { link: input.link } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
          ...(input.expiresAt !== undefined
            ? { expiresAt: new Date(input.expiresAt) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(supporters.id, id));

      return (
        (await db.query.supporters.findFirst({
          where: eq(supporters.id, id),
        })) ?? null
      );
    },
        /**
     * deleteSupporter 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteSupporter(id) {
      const exists = await db.query.supporters.findFirst({
        where: eq(supporters.id, id),
      });
      if (!exists) {
        return false;
      }
      await db.delete(supporters).where(eq(supporters.id, id));
      return true;
    },

        /**
     * listExhibitions의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 호출부와의 계약(입력 검증, null 처리, 에러 전파 규칙)을 일관되게 유지해야 합니다.
     */
    async listExhibitions() {
      const rows = await db
        .select()
        .from(exhibitions)
        .orderBy(asc(exhibitions.startDate));
      return mapExhibitionsWithImages(db, rows);
    },
        /**
     * listPublicExhibitions의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 공개 화면 렌더링 성능을 위해 정렬을 DB에서 수행합니다.
     */
    async listPublicExhibitions() {
      const rows = await db
        .select()
        .from(exhibitions)
        .orderBy(desc(exhibitions.startDate));
      return mapExhibitionsWithImages(db, rows);
    },
        /**
     * createExhibition 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async createExhibition(input) {
      const id = crypto.randomUUID();
      await db.insert(exhibitions).values({
        id,
        title: input.title,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        generationId: input.generationId,
        place: input.place,
        coverImageUrl: input.coverImageUrl,
        description: input.description,
      });
      return (await this.getExhibitionById(id))!;
    },
        /**
     * getExhibitionById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async getExhibitionById(id) {
      const row = await db.query.exhibitions.findFirst({
        where: eq(exhibitions.id, id),
      });
      if (!row) {
        return null;
      }
      const images = await db
        .select()
        .from(exhibitionImages)
        .where(eq(exhibitionImages.exhibitionId, id))
        .orderBy(asc(exhibitionImages.sortOrder));
      return {
        ...row,
        detailImages: images,
      };
    },
        /**
     * updateExhibition 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateExhibition(id, input) {
      const exists = await db.query.exhibitions.findFirst({
        where: eq(exhibitions.id, id),
      });
      if (!exists) {
        return null;
      }

      await db
        .update(exhibitions)
        .set({
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.startDate !== undefined
            ? { startDate: new Date(input.startDate) }
            : {}),
          ...(input.endDate !== undefined
            ? { endDate: new Date(input.endDate) }
            : {}),
          ...(input.generationId !== undefined
            ? { generationId: input.generationId }
            : {}),
          ...(input.place !== undefined ? { place: input.place } : {}),
          ...(input.coverImageUrl !== undefined
            ? { coverImageUrl: input.coverImageUrl }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(exhibitions.id, id));

      return this.getExhibitionById(id);
    },
        /**
     * deleteExhibition 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteExhibition(id) {
      const exists = await db.query.exhibitions.findFirst({
        where: eq(exhibitions.id, id),
      });
      if (!exists) {
        return false;
      }
      await db.delete(exhibitions).where(eq(exhibitions.id, id));
      return true;
    },
        /**
     * addExhibitionImage의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async addExhibitionImage(exhibitionId, input) {
      const parent = await db.query.exhibitions.findFirst({
        where: eq(exhibitions.id, exhibitionId),
      });
      if (!parent) {
        return null;
      }

      const id = crypto.randomUUID();
      await db.insert(exhibitionImages).values({
        id,
        exhibitionId,
        imageUrl: input.imageUrl,
        sortOrder: input.sortOrder,
      });
      return (
        (await db.query.exhibitionImages.findFirst({
          where: eq(exhibitionImages.id, id),
        })) ?? null
      );
    },
        /**
     * updateExhibitionImage 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
     * @param imageId 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateExhibitionImage(exhibitionId, imageId, input) {
      const exists = await db.query.exhibitionImages.findFirst({
        where: and(
          eq(exhibitionImages.id, imageId),
          eq(exhibitionImages.exhibitionId, exhibitionId),
        ),
      });
      if (!exists) {
        return null;
      }

      await db
        .update(exhibitionImages)
        .set({
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(exhibitionImages.id, imageId),
            eq(exhibitionImages.exhibitionId, exhibitionId),
          ),
        );

      return (
        (await db.query.exhibitionImages.findFirst({
          where: eq(exhibitionImages.id, imageId),
        })) ?? null
      );
    },
        /**
     * deleteExhibitionImage 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param exhibitionId 대상을 식별하기 위한 ID 값입니다.
     * @param imageId 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteExhibitionImage(exhibitionId, imageId) {
      const exists = await db.query.exhibitionImages.findFirst({
        where: and(
          eq(exhibitionImages.id, imageId),
          eq(exhibitionImages.exhibitionId, exhibitionId),
        ),
      });
      if (!exists) {
        return false;
      }
      await db
        .delete(exhibitionImages)
        .where(
          and(
            eq(exhibitionImages.id, imageId),
            eq(exhibitionImages.exhibitionId, exhibitionId),
          ),
        );
      return true;
    },

        /**
     * listLinktrees의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async listLinktrees() {
      const rows = await db.select().from(linktree);
      return mapLinktreesWithItems(db, rows);
    },
        /**
     * createLinktree 생성/등록 절차를 수행해 시스템 상태를 갱신합니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async createLinktree(input) {
      const id = crypto.randomUUID();
      await db.insert(linktree).values({
        id,
        name: input.name,
      });
      return (await this.getLinktreeById(id))!;
    },
        /**
     * getLinktreeById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async getLinktreeById(id) {
      const row = await db.query.linktree.findFirst({
        where: eq(linktree.id, id),
      });
      if (!row) {
        return null;
      }
      const items = await db
        .select()
        .from(linktreeItems)
        .where(eq(linktreeItems.linktreeId, id));
      return {
        ...row,
        items,
      };
    },
        /**
     * updateLinktree 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateLinktree(id, input) {
      const exists = await db.query.linktree.findFirst({
        where: eq(linktree.id, id),
      });
      if (!exists) {
        return null;
      }
      await db
        .update(linktree)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
        })
        .where(eq(linktree.id, id));
      return this.getLinktreeById(id);
    },
        /**
     * deleteLinktree 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteLinktree(id) {
      const exists = await db.query.linktree.findFirst({
        where: eq(linktree.id, id),
      });
      if (!exists) {
        return false;
      }
      await db.delete(linktree).where(eq(linktree.id, id));
      return true;
    },
        /**
     * addLinktreeItem의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @param linktreeId 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async addLinktreeItem(linktreeId, input) {
      const parent = await db.query.linktree.findFirst({
        where: eq(linktree.id, linktreeId),
      });
      if (!parent) {
        return null;
      }
      const id = crypto.randomUUID();
      await db.insert(linktreeItems).values({
        id,
        linktreeId,
        name: input.name,
        link: input.link,
      });
      return (
        (await db.query.linktreeItems.findFirst({
          where: eq(linktreeItems.id, id),
        })) ?? null
      );
    },
        /**
     * updateLinktreeItem 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param linktreeId 대상을 식별하기 위한 ID 값입니다.
     * @param itemId 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateLinktreeItem(linktreeId, itemId, input) {
      const exists = await db.query.linktreeItems.findFirst({
        where: and(
          eq(linktreeItems.id, itemId),
          eq(linktreeItems.linktreeId, linktreeId),
        ),
      });
      if (!exists) {
        return null;
      }
      await db
        .update(linktreeItems)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.link !== undefined ? { link: input.link } : {}),
        })
        .where(
          and(
            eq(linktreeItems.id, itemId),
            eq(linktreeItems.linktreeId, linktreeId),
          ),
        );
      return (
        (await db.query.linktreeItems.findFirst({
          where: eq(linktreeItems.id, itemId),
        })) ?? null
      );
    },
        /**
     * deleteLinktreeItem 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param linktreeId 대상을 식별하기 위한 ID 값입니다.
     * @param itemId 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteLinktreeItem(linktreeId, itemId) {
      const exists = await db.query.linktreeItems.findFirst({
        where: and(
          eq(linktreeItems.id, itemId),
          eq(linktreeItems.linktreeId, linktreeId),
        ),
      });
      if (!exists) {
        return false;
      }
      await db
        .delete(linktreeItems)
        .where(
          and(
            eq(linktreeItems.id, itemId),
            eq(linktreeItems.linktreeId, linktreeId),
          ),
        );
      return true;
    },

        /**
     * listUsers의 핵심 비즈니스 로직을 수행합니다 (비동기 처리 포함).
     * @returns 비동기 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async listUsers() {
      return db.select().from(user).orderBy(asc(user.createdAt));
    },
        /**
     * getUserById 값을 조회하거나 입력을 가공해 필요한 결과를 생성합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 조회/계산된 결과 값을 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async getUserById(id) {
      return (
        (await db.query.user.findFirst({ where: eq(user.id, id) })) ?? null
      );
    },
        /**
     * updateUser 기존 데이터나 상태를 갱신하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @param input 함수 로직에서 사용하는 입력값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async updateUser(id, input) {
      const exists = await db.query.user.findFirst({
        where: eq(user.id, id),
      });
      if (!exists) {
        return null;
      }
      await db
        .update(user)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.nickname !== undefined ? { nickname: input.nickname } : {}),
          ...(input.image !== undefined ? { image: input.image } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.generationId !== undefined
            ? { generationId: input.generationId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(user.id, id));

      return (
        (await db.query.user.findFirst({ where: eq(user.id, id) })) ?? null
      );
    },
        /**
     * deleteUser 대상 리소스를 정리하거나 제거하는 처리를 수행합니다.
     * @param id 대상을 식별하기 위한 ID 값입니다.
     * @returns 처리 결과를 Promise로 반환합니다.
     * @remarks 데이터 접근 시 입력값 검증과 트랜잭션/무결성 규칙을 함께 고려해야 합니다.
     */
    async deleteUser(id) {
      const exists = await db.query.user.findFirst({
        where: eq(user.id, id),
      });
      if (!exists) {
        return false;
      }
      await db.delete(user).where(eq(user.id, id));
      return true;
    },
  };
};
