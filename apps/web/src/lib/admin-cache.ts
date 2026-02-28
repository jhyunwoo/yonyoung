export const ADMIN_CACHE_TAGS = {
  generations: "admin:generations",
  activities: "admin:activities",
  exhibitions: "admin:exhibitions",
  linktree: "admin:linktree",
  notices: "admin:notices",
  users: "admin:users",
} as const;

export type AdminCacheTag = (typeof ADMIN_CACHE_TAGS)[keyof typeof ADMIN_CACHE_TAGS];

export const ADMIN_CACHE_TAG_VALUES = Object.values(ADMIN_CACHE_TAGS) as AdminCacheTag[];
