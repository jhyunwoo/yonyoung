import { and, asc, eq, isNull } from "drizzle-orm";
import { runAtomically } from "../../platform/db/batch";
import type createDB from "../../lib/db";
import { generations } from "../../platform/db/schema";
import type { GenerationEntity } from "../../lib/services/types";
import {
  createAuditRepository,
  listLatestAuditActorsByResourceId,
} from "../audit/audit.repository";

type Database = ReturnType<typeof createDB>;

export type CreateGenerationInput = {
  name: string;
  sortOrder: number;
  startDate: number;
  endDate: number;
};

export type UpdateGenerationInput = Partial<CreateGenerationInput>;

export type ReorderGenerationItem = { id: string; sortOrder: number };

export type ReorderGenerationsResult =
  | { status: "ok"; changedIds: string[] }
  | { status: "not_found" }
  | { status: "conflict" };

export const createGenerationRepository = (db: Database) => {
  const auditRepository = createAuditRepository(db);

  const findActiveGenerationByName = (name: string) =>
    db.query.generations.findFirst({
      where: and(eq(generations.name, name), isNull(generations.deletedAt)),
    });

  const findActiveGeneration = (id: string) =>
    db.query.generations.findFirst({
      where: and(eq(generations.id, id), isNull(generations.deletedAt)),
    });

  const getGenerationById = async (
    id: string,
  ): Promise<GenerationEntity | null> => {
    const row = (await findActiveGeneration(id)) ?? null;
    if (!row) {
      return null;
    }

    return {
      ...row,
      updatedBy: await auditRepository.getLatestAuditActor(
        "generation",
        row.id,
      ),
    };
  };

  return {
    getGenerationById,

    async listGenerations(): Promise<GenerationEntity[]> {
      const rows = await db
        .select()
        .from(generations)
        .where(isNull(generations.deletedAt))
        .orderBy(asc(generations.sortOrder));

      const updatedByMap = await listLatestAuditActorsByResourceId(
        db,
        "generation",
        rows.map((row) => row.id),
      );

      return rows.map((row) => ({
        ...row,
        updatedBy: updatedByMap[row.id] ?? null,
      }));
    },

    /**
     * 기수 이름은 삭제되지 않은 행들 사이에서만 유일해야 한다.
     * D1에는 부분 유니크 인덱스가 없어 애플리케이션에서 확인한 뒤,
     * 상위 계층이 409로 매핑하는 기존 UNIQUE 에러 메시지를 그대로 던진다.
     */
    async createGeneration(
      input: CreateGenerationInput,
    ): Promise<GenerationEntity> {
      const id = crypto.randomUUID();
      const generationName = input.name.trim();
      const existingGenerationWithSameName =
        await findActiveGenerationByName(generationName);
      if (existingGenerationWithSameName) {
        throw new Error("UNIQUE constraint failed: generations.name");
      }

      await db.insert(generations).values({
        id,
        name: generationName,
        sortOrder: input.sortOrder,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      return (await getGenerationById(id))!;
    },

    async updateGeneration(
      id: string,
      input: UpdateGenerationInput,
    ): Promise<GenerationEntity | null> {
      const exists = await findActiveGeneration(id);
      if (!exists) {
        return null;
      }

      const generationName = input.name?.trim();
      if (generationName !== undefined) {
        const existingGenerationWithSameName =
          await findActiveGenerationByName(generationName);
        if (
          existingGenerationWithSameName &&
          existingGenerationWithSameName.id !== id
        ) {
          throw new Error("UNIQUE constraint failed: generations.name");
        }
      }

      await db
        .update(generations)
        .set({
          ...(generationName !== undefined ? { name: generationName } : {}),
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
        .where(and(eq(generations.id, id), isNull(generations.deletedAt)));

      return getGenerationById(id);
    },

    /**
     * 여러 기수의 정렬 순서를 한 번에 바꾼다(예: 두 기수 자리 맞바꾸기).
     *
     * `sort_order`에는 삭제되지 않은 행 사이의 유니크 인덱스가 있고 SQLite는 문장마다 즉시
     * 검사한다. 그래서 A↔B를 PATCH 두 번으로 바꾸면 첫 요청이 409가 된다. 여기서는 한 D1
     * batch(트랜잭션) 안에서 ① 대상 행을 기존 값과 겹치지 않는 음수 임시값으로 옮긴 뒤
     * ② 최종 값으로 바꾼다. 중간에 실패하면 전부 롤백된다.
     */
    async reorderGenerations(
      items: ReorderGenerationItem[],
    ): Promise<ReorderGenerationsResult> {
      const activeRows = await db
        .select({ id: generations.id, sortOrder: generations.sortOrder })
        .from(generations)
        .where(isNull(generations.deletedAt));
      const currentSortOrderById = new Map(
        activeRows.map((row) => [row.id, row.sortOrder]),
      );
      if (items.some((item) => !currentSortOrderById.has(item.id))) {
        return { status: "not_found" };
      }

      const movingIds = new Set(items.map((item) => item.id));
      const sortOrdersHeldByOthers = new Set(
        activeRows
          .filter((row) => !movingIds.has(row.id))
          .map((row) => row.sortOrder),
      );
      if (items.some((item) => sortOrdersHeldByOthers.has(item.sortOrder))) {
        return { status: "conflict" };
      }

      const changed = items.filter(
        (item) => currentSortOrderById.get(item.id) !== item.sortOrder,
      );
      if (changed.length === 0) {
        return { status: "ok", changedIds: [] };
      }

      const lowestSortOrder = Math.min(
        0,
        ...activeRows.map((row) => row.sortOrder),
      );
      const updatedAt = new Date();
      const activeGeneration = (id: string) =>
        and(eq(generations.id, id), isNull(generations.deletedAt));
      await runAtomically(db, [
        ...changed.map((item, index) =>
          db
            .update(generations)
            .set({ sortOrder: lowestSortOrder - 1 - index })
            .where(activeGeneration(item.id)),
        ),
        ...changed.map((item) =>
          db
            .update(generations)
            .set({ sortOrder: item.sortOrder, updatedAt })
            .where(activeGeneration(item.id)),
        ),
      ]);

      return { status: "ok", changedIds: changed.map((item) => item.id) };
    },

    async deleteGeneration(id: string): Promise<boolean> {
      const exists = await findActiveGeneration(id);
      if (!exists) {
        return false;
      }
      await db
        .update(generations)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(generations.id, id), isNull(generations.deletedAt)));
      return true;
    },
  };
};

export type GenerationRepository = ReturnType<
  typeof createGenerationRepository
>;
