import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown) {
  return sqlString(JSON.stringify(value));
}

async function readJson(path: string) {
  const data = await readFile(path, "utf8");
  return JSON.parse(data) as unknown;
}

async function main() {
  const previewRoot = resolve(process.cwd(), "../../yonyoung-web-preview/src/config");
  const activities = (await readJson(resolve(previewRoot, "activities.json"))) as Array<Record<string, unknown>>;
  const exhibitions = (await readJson(resolve(previewRoot, "exhibitions.json"))) as Array<Record<string, unknown>>;
  const photographers = (await readJson(resolve(previewRoot, "photographers.json"))) as Array<{
    generation: string;
    members: Array<Record<string, unknown>>;
  }>;
  const linktree = (await readJson(resolve(previewRoot, "linktree.json"))) as Array<Record<string, unknown>>;
  const about = (await readJson(resolve(previewRoot, "about.json"))) as {
    activities: unknown;
    history: unknown;
  };
  const hero = (await readJson(resolve(previewRoot, "hero.json"))) as { backgroundImage?: string };

  const lines: string[] = [];

  lines.push("BEGIN TRANSACTION;");
  lines.push("DELETE FROM activities;");
  lines.push("DELETE FROM exhibitions;");
  lines.push("DELETE FROM photographers;");
  lines.push("DELETE FROM linktree_links;");

  for (const item of activities) {
    const title = String(item.title ?? "제목 없음");
    const date = String(item.date ?? "");
    const coverImageUrl = String(item.coverImage ?? item.image ?? "");
    const images = Array.isArray(item.images) ? item.images.map((entry) => String(entry)) : [coverImageUrl];
    lines.push(
      `INSERT INTO activities (title, date, cover_image_url, images_json, created_at, updated_at) VALUES (${sqlString(
        title
      )}, ${sqlString(date)}, ${sqlString(coverImageUrl)}, ${sqlJson(images)}, datetime('now'), datetime('now'));`
    );
  }

  for (const item of exhibitions) {
    const title = String(item.title ?? "전시");
    const date = String(item.date ?? "");
    const location = String(item.location ?? "");
    const description = String(item.description ?? "");
    const coverImageUrl = String(item.image ?? item.coverImage ?? "");
    const images = Array.isArray(item.images) ? item.images.map((entry) => String(entry)) : [coverImageUrl];

    lines.push(
      `INSERT INTO exhibitions (title, date, location, description, cover_image_url, images_json, created_at, updated_at) VALUES (${sqlString(
        title
      )}, ${sqlString(date)}, ${sqlString(location)}, ${sqlString(description)}, ${sqlString(coverImageUrl)}, ${sqlJson(
        images
      )}, datetime('now'), datetime('now'));`
    );
  }

  for (const group of photographers) {
    for (const member of group.members ?? []) {
      lines.push(
        `INSERT INTO photographers (generation, name, type, email, instagram, website, main_photo_url, works_json, created_at, updated_at) VALUES (${sqlString(
          String(member.generation ?? group.generation)
        )}, ${sqlString(String(member.name ?? ""))}, ${sqlString(String(member.type ?? "준회원"))}, ${sqlString(
          String(member.email ?? "")
        )}, ${sqlString(String(member.instagram ?? ""))}, ${sqlString(String(member.website ?? ""))}, ${sqlString(
          String(member.mainPhoto ?? "")
        )}, ${sqlJson(Array.isArray(member.works) ? member.works : [])}, datetime('now'), datetime('now'));`
      );
    }
  }

  for (const [index, link] of linktree.entries()) {
    lines.push(
      `INSERT INTO linktree_links (name, url, category, icon, display_order, created_at, updated_at) VALUES (${sqlString(
        String(link.name ?? "")
      )}, ${sqlString(String(link.url ?? ""))}, ${sqlString(String(link.category ?? "promotion"))}, ${sqlString(
        String(link.icon ?? "")
      )}, ${index}, datetime('now'), datetime('now'));`
    );
  }

  const aboutContent = {
    timeline: about.activities,
    history: about.history
  };

  lines.push(
    `INSERT OR REPLACE INTO site_pages (slug, title, content_json, updated_at) VALUES ('about', '연영회 소개', ${sqlJson(
      aboutContent
    )}, datetime('now'));`
  );

  lines.push(
    `INSERT OR REPLACE INTO hero_settings (id, background_image_url, updated_at) VALUES (1, ${sqlString(
      String(hero.backgroundImage ?? "")
    )}, datetime('now'));`
  );

  lines.push("COMMIT;");

  process.stdout.write(lines.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
