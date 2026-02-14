import { and, asc, eq, inArray } from "drizzle-orm";
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

const mapActivitiesWithImages = async (
  db: ReturnType<typeof createDB>,
  rows: (typeof activities.$inferSelect)[],
): Promise<ActivityEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
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

  return rows.map((row) => ({
    ...row,
    detailImages: imageMap.get(row.id) ?? [],
  }));
};

const mapExhibitionsWithImages = async (
  db: ReturnType<typeof createDB>,
  rows: (typeof exhibitions.$inferSelect)[],
): Promise<ExhibitionEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
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

  return rows.map((row) => ({
    ...row,
    detailImages: imageMap.get(row.id) ?? [],
  }));
};

const mapLinktreesWithItems = async (
  db: ReturnType<typeof createDB>,
  rows: (typeof linktree.$inferSelect)[],
): Promise<LinktreeEntity[]> => {
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((row) => row.id);
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

  return rows.map((row) => ({
    ...row,
    items: itemMap.get(row.id) ?? [],
  }));
};

export const createDbDataService = (database: D1Database): DataService => {
  const db = createDB(database);

  return {
    async listGenerations() {
      return db.select().from(generations).orderBy(asc(generations.sortOrder));
    },
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
    async getGenerationById(id) {
      return (
        (await db.query.generations.findFirst({
          where: eq(generations.id, id),
        })) ?? null
      );
    },
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

    async listActivities() {
      const rows = await db
        .select()
        .from(activities)
        .orderBy(asc(activities.activityDate));
      return mapActivitiesWithImages(db, rows);
    },
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

    async listSupporters() {
      return db.select().from(supporters).orderBy(asc(supporters.expiresAt));
    },
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
    async getSupporterById(id) {
      return (
        (await db.query.supporters.findFirst({
          where: eq(supporters.id, id),
        })) ?? null
      );
    },
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

    async listExhibitions() {
      const rows = await db
        .select()
        .from(exhibitions)
        .orderBy(asc(exhibitions.startDate));
      return mapExhibitionsWithImages(db, rows);
    },
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

    async listLinktrees() {
      const rows = await db.select().from(linktree);
      return mapLinktreesWithItems(db, rows);
    },
    async createLinktree(input) {
      const id = crypto.randomUUID();
      await db.insert(linktree).values({
        id,
        name: input.name,
      });
      return (await this.getLinktreeById(id))!;
    },
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

    async listUsers() {
      return db.select().from(user).orderBy(asc(user.createdAt));
    },
    async getUserById(id) {
      return (
        (await db.query.user.findFirst({ where: eq(user.id, id) })) ?? null
      );
    },
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
