import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { runAtomically } from "../../platform/db/batch";
import type createDB from "../../lib/db";
import { exhibitionImages, exhibitions } from "../../platform/db/schema";
import type {
  ExhibitionEntity,
  ExhibitionImageEntity,
  ImageDimensionsInput,
} from "../../lib/services/types";
import { selectInChunks } from "../../platform/db/query-chunking";
import {
  sortBySortOrder,
  toImageDimensionsPatch,
} from "../../platform/db/row-values";
import { listLatestAuditActorsByResourceId } from "../audit/audit.repository";

type Database = ReturnType<typeof createDB>;
type ExhibitionRow = typeof exhibitions.$inferSelect;

export type CreateExhibitionInput = {
  title: string;
  startDate: number;
  endDate: number;
  generationId: string;
  place: string;
  coverImageUrl: string;
  description: string;
};

export type UpdateExhibitionInput = Partial<CreateExhibitionInput>;

export type CreateExhibitionImageInput = ImageDimensionsInput & {
  imageUrl: string;
  sortOrder: number;
};

export type UpdateExhibitionImageInput = ImageDimensionsInput &
  Partial<{ imageUrl: string; sortOrder: number }>;

export type UpdateExhibitionImageBatchItem = ImageDimensionsInput & {
  imageId: string;
  imageUrl?: string;
  sortOrder?: number;
};

const mapExhibitionsWithImages = async (
  db: Database,
  rows: ExhibitionRow[],
): Promise<ExhibitionEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const imageRows = await selectInChunks(ids, (chunk) =>
    db
      .select()
      .from(exhibitionImages)
      .where(
        and(
          inArray(exhibitionImages.exhibitionId, chunk),
          isNull(exhibitionImages.deletedAt),
        ),
      )
      .orderBy(asc(exhibitionImages.sortOrder)),
  );

  const imageMap = new Map<string, ExhibitionImageEntity[]>();
  for (const imageRow of imageRows) {
    const current = imageMap.get(imageRow.exhibitionId) ?? [];
    current.push(imageRow);
    imageMap.set(imageRow.exhibitionId, current);
  }

  const updatedByMap = await listLatestAuditActorsByResourceId(
    db,
    "exhibition",
    ids,
  );

  return rows.map((row) => ({
    ...row,
    updatedBy: updatedByMap[row.id] ?? null,
    detailImages: imageMap.get(row.id) ?? [],
  }));
};

export const createExhibitionRepository = (
  db: Database,
  database: D1Database,
) => {
  const findActiveExhibition = (id: string) =>
    db.query.exhibitions.findFirst({
      where: and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)),
    });

  const touchExhibition = (exhibitionId: string) =>
    db
      .update(exhibitions)
      .set({ updatedAt: new Date() })
      .where(
        and(eq(exhibitions.id, exhibitionId), isNull(exhibitions.deletedAt)),
      );

  const getExhibitionById = async (
    id: string,
  ): Promise<ExhibitionEntity | null> => {
    const row = await findActiveExhibition(id);
    if (!row) {
      return null;
    }
    return (await mapExhibitionsWithImages(db, [row]))[0] ?? null;
  };

  return {
    getExhibitionById,

    async listExhibitions(generationId?: string): Promise<ExhibitionEntity[]> {
      const conditions = [isNull(exhibitions.deletedAt)];
      if (generationId) {
        conditions.push(eq(exhibitions.generationId, generationId));
      }

      const rows = await db
        .select()
        .from(exhibitions)
        .where(and(...conditions))
        .orderBy(asc(exhibitions.startDate));
      return mapExhibitionsWithImages(db, rows);
    },

    /** 공개 화면 렌더링 성능을 위해 정렬을 DB에서 수행한다. */
    async listPublicExhibitions(): Promise<ExhibitionEntity[]> {
      const rows = await db
        .select()
        .from(exhibitions)
        .where(isNull(exhibitions.deletedAt))
        .orderBy(desc(exhibitions.startDate));
      return mapExhibitionsWithImages(db, rows);
    },

    async createExhibition(
      input: CreateExhibitionInput,
    ): Promise<ExhibitionEntity> {
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
      return (await getExhibitionById(id))!;
    },

    async updateExhibition(
      id: string,
      input: UpdateExhibitionInput,
    ): Promise<ExhibitionEntity | null> {
      const exists = await findActiveExhibition(id);
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
        .where(and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt)));

      return getExhibitionById(id);
    },

    /** 전시 soft delete는 소속 세부 이미지까지 함께 내린다. */
    async deleteExhibition(id: string): Promise<boolean> {
      const exists = await findActiveExhibition(id);
      if (!exists) {
        return false;
      }
      // 부모와 자식 soft delete를 한 트랜잭션으로 묶어 자식만 남는 상태를 만들지 않는다.
      const deletedAt = new Date();
      await runAtomically(db, [
        db
          .update(exhibitions)
          .set({ deletedAt, updatedAt: deletedAt })
          .where(and(eq(exhibitions.id, id), isNull(exhibitions.deletedAt))),
        db
          .update(exhibitionImages)
          .set({ deletedAt, updatedAt: deletedAt })
          .where(
            and(
              eq(exhibitionImages.exhibitionId, id),
              isNull(exhibitionImages.deletedAt),
            ),
          ),
      ]);
      return true;
    },

    async addExhibitionImage(
      exhibitionId: string,
      input: CreateExhibitionImageInput,
    ): Promise<ExhibitionImageEntity | null> {
      const parent = await findActiveExhibition(exhibitionId);
      if (!parent) {
        return null;
      }

      const id = crypto.randomUUID();
      await db.insert(exhibitionImages).values({
        id,
        exhibitionId,
        imageUrl: input.imageUrl,
        sortOrder: input.sortOrder,
        ...toImageDimensionsPatch(input),
      });
      await touchExhibition(exhibitionId);
      return (
        (await db.query.exhibitionImages.findFirst({
          where: and(
            eq(exhibitionImages.id, id),
            isNull(exhibitionImages.deletedAt),
          ),
        })) ?? null
      );
    },

    /** 세부 이미지 일괄 추가는 D1 batch 한 번으로 묶어 왕복 지연을 줄인다. */
    async addExhibitionImages(
      exhibitionId: string,
      input: CreateExhibitionImageInput[],
    ): Promise<ExhibitionImageEntity[] | null> {
      const parent = await findActiveExhibition(exhibitionId);
      if (!parent) {
        return null;
      }

      const createdIds: string[] = [];
      const statements = input.map((item) => {
        const id = crypto.randomUUID();
        createdIds.push(id);
        return database
          .prepare(
            `insert into "exhibition_images" ("id", "exhibition_id", "image_url", "sort_order", "width", "height") values (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            exhibitionId,
            item.imageUrl,
            item.sortOrder,
            item.width ?? null,
            item.height ?? null,
          );
      });

      if (statements.length > 0) {
        await database.batch(statements);
        await touchExhibition(exhibitionId);
      }

      if (createdIds.length === 0) {
        return [];
      }

      return sortBySortOrder(
        await selectInChunks(createdIds, (chunk) =>
          db
            .select()
            .from(exhibitionImages)
            .where(
              and(
                inArray(exhibitionImages.id, chunk),
                isNull(exhibitionImages.deletedAt),
              ),
            ),
        ),
      );
    },

    async updateExhibitionImage(
      exhibitionId: string,
      imageId: string,
      input: UpdateExhibitionImageInput,
    ): Promise<ExhibitionImageEntity | null> {
      const exists = await db.query.exhibitionImages.findFirst({
        where: and(
          eq(exhibitionImages.id, imageId),
          eq(exhibitionImages.exhibitionId, exhibitionId),
          isNull(exhibitionImages.deletedAt),
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
          ...toImageDimensionsPatch(input),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(exhibitionImages.id, imageId),
            eq(exhibitionImages.exhibitionId, exhibitionId),
            isNull(exhibitionImages.deletedAt),
          ),
        );
      await touchExhibition(exhibitionId);

      return (
        (await db.query.exhibitionImages.findFirst({
          where: and(
            eq(exhibitionImages.id, imageId),
            isNull(exhibitionImages.deletedAt),
          ),
        })) ?? null
      );
    },

    /** 요청된 이미지 중 하나라도 이 전시에 없으면 부분 적용 없이 전체를 거절한다. */
    async updateExhibitionImages(
      exhibitionId: string,
      input: UpdateExhibitionImageBatchItem[],
    ): Promise<ExhibitionImageEntity[] | null> {
      const parent = await findActiveExhibition(exhibitionId);
      if (!parent) {
        return null;
      }

      const imageIds = input.map((item) => item.imageId);
      if (imageIds.length === 0) {
        return [];
      }
      // D1은 쿼리당 바인딩 100개가 한도라 id 목록은 나눠서 확인한다.
      const existing = await selectInChunks(imageIds, (chunk) =>
        db
          .select({ id: exhibitionImages.id })
          .from(exhibitionImages)
          .where(
            and(
              eq(exhibitionImages.exhibitionId, exhibitionId),
              inArray(exhibitionImages.id, chunk),
              isNull(exhibitionImages.deletedAt),
            ),
          ),
      );

      if (existing.length !== imageIds.length) {
        return null;
      }

      // 순서 변경은 전부 반영되거나 전혀 반영되지 않아야 한다(중간 실패 시 순서가 섞인다).
      const updatedAt = new Date();
      await runAtomically(
        db,
        input.map((item) =>
          db
            .update(exhibitionImages)
            .set({
              ...(item.imageUrl !== undefined
                ? { imageUrl: item.imageUrl }
                : {}),
              ...(item.sortOrder !== undefined
                ? { sortOrder: item.sortOrder }
                : {}),
              ...toImageDimensionsPatch(item),
              updatedAt,
            })
            .where(
              and(
                eq(exhibitionImages.id, item.imageId),
                eq(exhibitionImages.exhibitionId, exhibitionId),
                isNull(exhibitionImages.deletedAt),
              ),
            ),
        ),
      );
      await touchExhibition(exhibitionId);

      return sortBySortOrder(
        await selectInChunks(imageIds, (chunk) =>
          db
            .select()
            .from(exhibitionImages)
            .where(
              and(
                inArray(exhibitionImages.id, chunk),
                isNull(exhibitionImages.deletedAt),
              ),
            ),
        ),
      );
    },

    async deleteExhibitionImage(
      exhibitionId: string,
      imageId: string,
    ): Promise<boolean> {
      const exists = await db.query.exhibitionImages.findFirst({
        where: and(
          eq(exhibitionImages.id, imageId),
          eq(exhibitionImages.exhibitionId, exhibitionId),
          isNull(exhibitionImages.deletedAt),
        ),
      });
      if (!exists) {
        return false;
      }
      await db
        .update(exhibitionImages)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(exhibitionImages.id, imageId),
            eq(exhibitionImages.exhibitionId, exhibitionId),
            isNull(exhibitionImages.deletedAt),
          ),
        );
      await touchExhibition(exhibitionId);
      return true;
    },
  };
};

export type ExhibitionRepository = ReturnType<
  typeof createExhibitionRepository
>;
