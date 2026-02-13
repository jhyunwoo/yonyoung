export type EntityId = number;

export interface Asset {
  id: EntityId;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
  createdBy: string | null;
}

export interface Activity {
  id: EntityId;
  title: string;
  date: string;
  coverImageUrl: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Exhibition {
  id: EntityId;
  title: string;
  date: string;
  location: string;
  description: string;
  coverImageUrl: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export type PhotographerType = "정회원" | "준회원";

export interface Photographer {
  id: EntityId;
  generation: string;
  name: string;
  type: PhotographerType;
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

export interface LinktreeLink {
  id: EntityId;
  name: string;
  url: string;
  category: "promotion" | "inquiry" | "activity" | "sponsor" | "private";
  icon: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type SitePageSlug = "about" | "recruiting" | "donate" | "supporters";

export interface SitePage {
  slug: SitePageSlug;
  title: string;
  contentJson: unknown;
  updatedAt: string;
}

export interface HeroSettings {
  backgroundImageUrl: string;
  updatedAt: string;
}

export interface AdminRole {
  userId: string;
  role: "SUPER_ADMIN" | "EDITOR";
  grantedAt: string;
}

export interface CursorPagination<T> {
  items: T[];
  nextCursor: number | null;
}

export interface PublicHomePayload {
  hero: HeroSettings;
  latestExhibition: Exhibition | null;
  latestActivities: Activity[];
}
