import { createServerApiClient } from "./api-client";
import { unwrapData } from "./api-result";

export async function fetchPublicActivities() {
  const client = createServerApiClient();
  return unwrapData(client.v1.public.activities.$get());
}

export async function fetchPublicExhibitions() {
  const client = createServerApiClient();
  return unwrapData(client.v1.public.exhibitions.$get());
}

export async function fetchPublicHero() {
  const client = createServerApiClient();
  return unwrapData(client.v1.public.hero.$get());
}

export async function fetchPublicPage(slug: "about" | "recruiting" | "donate" | "supporters") {
  const client = createServerApiClient();
  return unwrapData(client.v1.public.pages[":slug"].$get({ param: { slug } }));
}
