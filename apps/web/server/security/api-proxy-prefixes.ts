export const API_PROXY_ALLOWED_PREFIXES = [
  "activities",
  "admin",
  "attachments",
  "audit",
  "exhibitions",
  "generations",
  "health",
  "linktree",
  "page-views",
  "public",
  "recruiting",
  "recruiting-plan",
  "site",
  "site-settings",
  "users",
] as const;

export const API_PROXY_BLOCKED_PREFIXES = ["internal", "auth"] as const;
