import { json } from "./db";

type SitePageSlug = "about" | "recruiting" | "donate" | "supporters";

export interface Activity {
  id: number;
  title: string;
  date: string;
  coverImageUrl: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Exhibition {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
  coverImageUrl: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HeroSettings {
  backgroundImageUrl: string;
  updatedAt: string;
}

export interface LinktreeLink {
  id: number;
  name: string;
  url: string;
  category: "promotion" | "inquiry" | "activity" | "sponsor" | "private";
  icon: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Photographer {
  id: number;
  generation: string;
  name: string;
  type: "정회원" | "준회원";
  email: string;
  instagram: string;
  website: string;
  mainPhotoUrl: string;
  works: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PhotographerGroup {
  generation: string;
  members: Photographer[];
}

export interface SitePage {
  slug: SitePageSlug;
  title: string;
  contentJson: unknown;
  updatedAt: string;
}

export interface CreateActivityInput {
  title: string;
  date: string;
  coverImageUrl: string;
  images: string[];
}

export type UpdateActivityInput = Partial<CreateActivityInput>;

export interface CreateExhibitionInput {
  title: string;
  date: string;
  location: string;
  description: string;
  coverImageUrl: string;
  images: string[];
}

export type UpdateExhibitionInput = Partial<CreateExhibitionInput>;

export interface CreatePhotographerInput {
  generation: string;
  name: string;
  type: "정회원" | "준회원";
  email: string;
  instagram: string;
  website: string;
  mainPhotoUrl: string;
  works: string[];
}

export type UpdatePhotographerInput = Partial<CreatePhotographerInput>;

export interface CreateLinkInput {
  name: string;
  url: string;
  category: "promotion" | "inquiry" | "activity" | "sponsor" | "private";
  icon: string;
  order: number;
}

export type UpdateLinkInput = Partial<CreateLinkInput>;

export interface UpdatePageInput {
  title: string;
  contentJson: unknown;
}

export interface UpdateHeroInput {
  backgroundImageUrl: string;
}

function now() {
  return new Date().toISOString();
}

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    date: String(row.date ?? ""),
    coverImageUrl: String(row.cover_image_url ?? ""),
    images: json.parse<string[]>(row.images_json, []),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function rowToExhibition(row: Record<string, unknown>): Exhibition {
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    date: String(row.date ?? ""),
    location: String(row.location ?? ""),
    description: String(row.description ?? ""),
    coverImageUrl: String(row.cover_image_url ?? ""),
    images: json.parse<string[]>(row.images_json, []),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function rowToPhotographer(row: Record<string, unknown>): Photographer {
  return {
    id: Number(row.id),
    generation: String(row.generation ?? ""),
    name: String(row.name ?? ""),
    type: (row.type === "정회원" ? "정회원" : "준회원") as "정회원" | "준회원",
    email: String(row.email ?? ""),
    instagram: String(row.instagram ?? ""),
    website: String(row.website ?? ""),
    mainPhotoUrl: String(row.main_photo_url ?? ""),
    works: json.parse<string[]>(row.works_json, []),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function rowToLink(row: Record<string, unknown>): LinktreeLink {
  const categoryRaw = String(row.category ?? "promotion");
  const allowedCategories = ["promotion", "inquiry", "activity", "sponsor", "private"] as const;
  const category = allowedCategories.includes(categoryRaw as (typeof allowedCategories)[number])
    ? (categoryRaw as (typeof allowedCategories)[number])
    : "promotion";

  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    url: String(row.url ?? ""),
    category,
    icon: String(row.icon ?? ""),
    order: Number(row.display_order ?? 0),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

function rowToSitePage(row: Record<string, unknown>): SitePage {
  return {
    slug: String(row.slug ?? "about") as SitePageSlug,
    title: String(row.title ?? ""),
    contentJson: json.parse(row.content_json, {}),
    updatedAt: String(row.updated_at ?? "")
  };
}

export class ContentRepository {
  constructor(private readonly db: D1Database) {}

  async listActivities(limit = 100): Promise<Activity[]> {
    const result = await this.db
      .prepare("SELECT * FROM activities ORDER BY date DESC, id DESC LIMIT ?")
      .bind(limit)
      .all<Record<string, unknown>>();

    return result.results.map(rowToActivity);
  }

  async getActivity(id: number): Promise<Activity | null> {
    const row = await this.db.prepare("SELECT * FROM activities WHERE id = ?").bind(id).first<Record<string, unknown>>();
    return row ? rowToActivity(row) : null;
  }

  async createActivity(input: CreateActivityInput): Promise<Activity> {
    const timestamp = now();
    const response = await this.db
      .prepare(
        "INSERT INTO activities (title, date, cover_image_url, images_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        input.title,
        input.date,
        input.coverImageUrl,
        JSON.stringify(input.images),
        timestamp,
        timestamp
      )
      .run();

    const created = await this.getActivity(response.meta.last_row_id as number);
    if (!created) throw new Error("failed to create activity");
    return created;
  }

  async updateActivity(id: number, input: UpdateActivityInput): Promise<Activity | null> {
    const existing = await this.getActivity(id);
    if (!existing) return null;

    const next = {
      title: input.title ?? existing.title,
      date: input.date ?? existing.date,
      coverImageUrl: input.coverImageUrl ?? existing.coverImageUrl,
      images: input.images ?? existing.images
    };

    await this.db
      .prepare(
        "UPDATE activities SET title = ?, date = ?, cover_image_url = ?, images_json = ?, updated_at = ? WHERE id = ?"
      )
      .bind(next.title, next.date, next.coverImageUrl, JSON.stringify(next.images), now(), id)
      .run();

    return this.getActivity(id);
  }

  async deleteActivity(id: number): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM activities WHERE id = ?").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async listExhibitions(limit = 100): Promise<Exhibition[]> {
    const result = await this.db
      .prepare("SELECT * FROM exhibitions ORDER BY id DESC LIMIT ?")
      .bind(limit)
      .all<Record<string, unknown>>();

    return result.results.map(rowToExhibition);
  }

  async getExhibition(id: number): Promise<Exhibition | null> {
    const row = await this.db
      .prepare("SELECT * FROM exhibitions WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? rowToExhibition(row) : null;
  }

  async createExhibition(input: CreateExhibitionInput): Promise<Exhibition> {
    const timestamp = now();
    const response = await this.db
      .prepare(
        "INSERT INTO exhibitions (title, date, location, description, cover_image_url, images_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        input.title,
        input.date,
        input.location,
        input.description,
        input.coverImageUrl,
        JSON.stringify(input.images),
        timestamp,
        timestamp
      )
      .run();

    const created = await this.getExhibition(response.meta.last_row_id as number);
    if (!created) throw new Error("failed to create exhibition");
    return created;
  }

  async updateExhibition(id: number, input: UpdateExhibitionInput): Promise<Exhibition | null> {
    const existing = await this.getExhibition(id);
    if (!existing) return null;

    const next = {
      title: input.title ?? existing.title,
      date: input.date ?? existing.date,
      location: input.location ?? existing.location,
      description: input.description ?? existing.description,
      coverImageUrl: input.coverImageUrl ?? existing.coverImageUrl,
      images: input.images ?? existing.images
    };

    await this.db
      .prepare(
        "UPDATE exhibitions SET title = ?, date = ?, location = ?, description = ?, cover_image_url = ?, images_json = ?, updated_at = ? WHERE id = ?"
      )
      .bind(
        next.title,
        next.date,
        next.location,
        next.description,
        next.coverImageUrl,
        JSON.stringify(next.images),
        now(),
        id
      )
      .run();

    return this.getExhibition(id);
  }

  async deleteExhibition(id: number): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM exhibitions WHERE id = ?").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async listPhotographers(): Promise<Photographer[]> {
    const result = await this.db
      .prepare("SELECT * FROM photographers ORDER BY CAST(REPLACE(generation, '기', '') AS INTEGER) DESC, type ASC, name ASC")
      .all<Record<string, unknown>>();

    return result.results.map(rowToPhotographer);
  }

  async getPhotographer(id: number): Promise<Photographer | null> {
    const row = await this.db
      .prepare("SELECT * FROM photographers WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? rowToPhotographer(row) : null;
  }

  async listPhotographerGroups(): Promise<PhotographerGroup[]> {
    const rows = await this.listPhotographers();
    const grouped = new Map<string, Photographer[]>();

    for (const photographer of rows) {
      const list = grouped.get(photographer.generation) ?? [];
      list.push(photographer);
      grouped.set(photographer.generation, list);
    }

    return [...grouped.entries()].map(([generation, members]) => ({ generation, members }));
  }

  async createPhotographer(input: CreatePhotographerInput): Promise<Photographer> {
    const timestamp = now();
    const response = await this.db
      .prepare(
        "INSERT INTO photographers (generation, name, type, email, instagram, website, main_photo_url, works_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        input.generation,
        input.name,
        input.type,
        input.email,
        input.instagram,
        input.website,
        input.mainPhotoUrl,
        JSON.stringify(input.works),
        timestamp,
        timestamp
      )
      .run();

    const created = await this.getPhotographer(response.meta.last_row_id as number);
    if (!created) throw new Error("failed to create photographer");
    return created;
  }

  async updatePhotographer(id: number, input: UpdatePhotographerInput): Promise<Photographer | null> {
    const existing = await this.getPhotographer(id);
    if (!existing) return null;

    const next = {
      generation: input.generation ?? existing.generation,
      name: input.name ?? existing.name,
      type: input.type ?? existing.type,
      email: input.email ?? existing.email,
      instagram: input.instagram ?? existing.instagram,
      website: input.website ?? existing.website,
      mainPhotoUrl: input.mainPhotoUrl ?? existing.mainPhotoUrl,
      works: input.works ?? existing.works
    };

    await this.db
      .prepare(
        "UPDATE photographers SET generation = ?, name = ?, type = ?, email = ?, instagram = ?, website = ?, main_photo_url = ?, works_json = ?, updated_at = ? WHERE id = ?"
      )
      .bind(
        next.generation,
        next.name,
        next.type,
        next.email,
        next.instagram,
        next.website,
        next.mainPhotoUrl,
        JSON.stringify(next.works),
        now(),
        id
      )
      .run();

    return this.getPhotographer(id);
  }

  async deletePhotographer(id: number): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM photographers WHERE id = ?").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async listLinks(): Promise<LinktreeLink[]> {
    const result = await this.db
      .prepare("SELECT * FROM linktree_links ORDER BY display_order ASC, id ASC")
      .all<Record<string, unknown>>();

    return result.results.map(rowToLink);
  }

  async getLink(id: number): Promise<LinktreeLink | null> {
    const row = await this.db
      .prepare("SELECT * FROM linktree_links WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();
    return row ? rowToLink(row) : null;
  }

  async createLink(input: CreateLinkInput): Promise<LinktreeLink> {
    const timestamp = now();
    const response = await this.db
      .prepare(
        "INSERT INTO linktree_links (name, url, category, icon, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(input.name, input.url, input.category, input.icon, input.order, timestamp, timestamp)
      .run();

    const created = await this.getLink(response.meta.last_row_id as number);
    if (!created) throw new Error("failed to create link");
    return created;
  }

  async updateLink(id: number, input: UpdateLinkInput): Promise<LinktreeLink | null> {
    const existing = await this.getLink(id);
    if (!existing) return null;

    const next = {
      name: input.name ?? existing.name,
      url: input.url ?? existing.url,
      category: input.category ?? existing.category,
      icon: input.icon ?? existing.icon,
      order: input.order ?? existing.order
    };

    await this.db
      .prepare(
        "UPDATE linktree_links SET name = ?, url = ?, category = ?, icon = ?, display_order = ?, updated_at = ? WHERE id = ?"
      )
      .bind(next.name, next.url, next.category, next.icon, next.order, now(), id)
      .run();

    return this.getLink(id);
  }

  async deleteLink(id: number): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM linktree_links WHERE id = ?").bind(id).run();
    return (result.meta.changes ?? 0) > 0;
  }

  async getPage(slug: SitePageSlug): Promise<SitePage | null> {
    const row = await this.db
      .prepare("SELECT * FROM site_pages WHERE slug = ?")
      .bind(slug)
      .first<Record<string, unknown>>();

    return row ? rowToSitePage(row) : null;
  }

  async updatePage(slug: SitePageSlug, input: UpdatePageInput): Promise<SitePage | null> {
    await this.db
      .prepare(
        "INSERT INTO site_pages (slug, title, content_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, content_json = excluded.content_json, updated_at = excluded.updated_at"
      )
      .bind(slug, input.title, JSON.stringify(input.contentJson), now())
      .run();

    return this.getPage(slug);
  }

  async getHero(): Promise<HeroSettings> {
    const row = await this.db
      .prepare("SELECT background_image_url, updated_at FROM hero_settings WHERE id = 1")
      .first<{ background_image_url: string; updated_at: string }>();

    return {
      backgroundImageUrl: row?.background_image_url ?? "",
      updatedAt: row?.updated_at ?? ""
    };
  }

  async updateHero(input: UpdateHeroInput): Promise<HeroSettings> {
    await this.db
      .prepare("UPDATE hero_settings SET background_image_url = ?, updated_at = ? WHERE id = 1")
      .bind(input.backgroundImageUrl, now())
      .run();

    return this.getHero();
  }

  async upsertAdminRole(userId: string, role: "SUPER_ADMIN" | "EDITOR"): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO admin_roles (user_id, role, granted_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET role = excluded.role"
      )
      .bind(userId, role, now())
      .run();
  }

  async getAdminRole(userId: string): Promise<"SUPER_ADMIN" | "EDITOR" | null> {
    const row = await this.db
      .prepare("SELECT role FROM admin_roles WHERE user_id = ?")
      .bind(userId)
      .first<{ role: string }>();

    if (!row?.role) return null;
    return row.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "EDITOR";
  }

  async logAudit(input: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string;
    detailJson?: unknown;
  }): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(
        input.actorUserId ?? null,
        input.action,
        input.entityType,
        input.entityId ?? null,
        input.detailJson ? JSON.stringify(input.detailJson) : null,
        now()
      )
      .run();
  }
}
