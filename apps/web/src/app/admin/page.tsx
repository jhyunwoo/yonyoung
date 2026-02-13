"use client";

import type { Activity, Exhibition, LinktreeLink, Photographer, SitePageSlug } from "@yonyoung/contracts";
import { authClient, useSession } from "@yonyoung/auth";
import { useEffect, useMemo, useState } from "react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { createBrowserApiClient } from "@/lib/api-client";
import { unwrapData } from "@/lib/api-result";

const proxyBase = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/proxy";
const apiClient = createBrowserApiClient(proxyBase);

type PageDraft = {
  slug: SitePageSlug;
  title: string;
  contentJson: unknown;
};

async function proxyFetch<T>(request: Promise<Response>) {
  const response = await request;
  return unwrapData<T>(response as never);
}

export default function AdminPage() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<"activity" | "exhibition" | "photographer" | "link" | "page" | "hero">("activity");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [links, setLinks] = useState<LinktreeLink[]>([]);
  const [pages, setPages] = useState<Record<SitePageSlug, PageDraft>>({
    about: { slug: "about", title: "", contentJson: {} },
    recruiting: { slug: "recruiting", title: "", contentJson: {} },
    donate: { slug: "donate", title: "", contentJson: {} },
    supporters: { slug: "supporters", title: "", contentJson: {} }
  });
  const [pageSlug, setPageSlug] = useState<SitePageSlug>("about");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    void Promise.all([
      proxyFetch<Activity[]>(apiClient.v1.public.activities.$get()).then(setActivities),
      proxyFetch<Exhibition[]>(apiClient.v1.public.exhibitions.$get()).then(setExhibitions),
      proxyFetch<unknown[]>(apiClient.v1.public.photographers.$get()).then((groups) => {
        const flattened = groups
          .flatMap((group) => (group as { members: Photographer[] }).members ?? [])
          .sort((a, b) => b.generation.localeCompare(a.generation));
        setPhotographers(flattened);
      }),
      proxyFetch<LinktreeLink[]>(apiClient.v1.public.linktree.$get()).then(setLinks),
      proxyFetch<{ backgroundImageUrl: string }>(apiClient.v1.public.hero.$get()).then((hero) => setHeroImageUrl(hero.backgroundImageUrl)),
      proxyFetch<{ slug: SitePageSlug; title: string; contentJson: unknown }>(
        apiClient.v1.public.pages[":slug"].$get({ param: { slug: "about" } })
      ).then((page) =>
        setPages((prev) => ({ ...prev, about: page }))
      ),
      proxyFetch<{ slug: SitePageSlug; title: string; contentJson: unknown }>(
        apiClient.v1.public.pages[":slug"].$get({ param: { slug: "recruiting" } })
      ).then((page) =>
        setPages((prev) => ({ ...prev, recruiting: page }))
      ),
      proxyFetch<{ slug: SitePageSlug; title: string; contentJson: unknown }>(
        apiClient.v1.public.pages[":slug"].$get({ param: { slug: "donate" } })
      ).then((page) =>
        setPages((prev) => ({ ...prev, donate: page }))
      ),
      proxyFetch<{ slug: SitePageSlug; title: string; contentJson: unknown }>(
        apiClient.v1.public.pages[":slug"].$get({ param: { slug: "supporters" } })
      ).then((page) =>
        setPages((prev) => ({ ...prev, supporters: page }))
      )
    ]).catch((error) => {
      setMessage(error instanceof Error ? error.message : "관리자 데이터를 불러오지 못했습니다.");
    });
  }, [session]);

  const currentPageSlug = useMemo<SitePageSlug>(() => pageSlug, [pageSlug]);

  if (isPending) {
    return <div className="px-6 py-20">세션 확인 중...</div>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8">
          <h1 className="text-2xl font-semibold">관리자 인증 필요</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">로그인 페이지에서 관리자 인증을 완료해주세요.</p>
          <a href="/admin/login" className="mt-6 inline-block rounded bg-[var(--primary-color)] px-4 py-2 text-white">
            로그인하러 가기
          </a>
        </div>
      </div>
    );
  }

  const addActivity = async () => {
    const created = await proxyFetch<Activity>(
      apiClient.v1.admin.activities.$post({
        json: {
        title: "새 활동",
        date: new Date().toISOString().slice(0, 10),
        coverImageUrl: heroImageUrl || "/images/banner/김세헌_0025.jpg",
        images: [heroImageUrl || "/images/banner/김세헌_0025.jpg"]
      }
      })
    );
    setActivities((prev) => [created, ...prev]);
    setMessage("활동이 추가되었습니다.");
  };

  const addExhibition = async () => {
    const created = await proxyFetch<Exhibition>(
      apiClient.v1.admin.exhibitions.$post({
        json: {
        title: "새 전시",
        date: new Date().toISOString().slice(0, 10),
        location: "연세대학교",
        description: "",
        coverImageUrl: heroImageUrl || "/images/banner/김세헌_0164.jpg",
        images: [heroImageUrl || "/images/banner/김세헌_0164.jpg"]
      }
      })
    );
    setExhibitions((prev) => [created, ...prev]);
    setMessage("전시가 추가되었습니다.");
  };

  const addPhotographer = async () => {
    const created = await proxyFetch<Photographer>(
      apiClient.v1.admin.photographers.$post({
        json: {
        generation: "60기",
        name: `새 사진가 ${photographers.length + 1}`,
        type: "준회원",
        email: "",
        instagram: "",
        website: "",
        mainPhotoUrl: "",
        works: []
      }
      })
    );
    setPhotographers((prev) => [created, ...prev]);
    setMessage("사진가가 추가되었습니다.");
  };

  const addLink = async () => {
    const created = await proxyFetch<LinktreeLink>(
      apiClient.v1.admin.linktree.$post({
        json: {
        name: `New Link ${links.length + 1}`,
        url: "https://example.com",
        category: "promotion",
        icon: "",
        order: links.length
      }
      })
    );
    setLinks((prev) => [...prev, created]);
    setMessage("링크가 추가되었습니다.");
  };

  const saveHero = async () => {
    await proxyFetch(apiClient.v1.admin.hero.$patch({ json: { backgroundImageUrl: heroImageUrl } }));
    setMessage("히어로 이미지가 저장되었습니다.");
  };

  const savePage = async (slug: SitePageSlug) => {
    const draft = pages[slug];
    const updated = await proxyFetch<PageDraft>(
      apiClient.v1.admin.pages[":slug"].$patch({
        param: { slug },
        json: {
        title: draft.title,
        contentJson: draft.contentJson
      }
      })
    );

    setPages((prev) => ({ ...prev, [slug]: updated }));
    setMessage(`${slug} 페이지가 저장되었습니다.`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Admin Console</h1>
          <p className="text-sm text-[var(--text-secondary)]">Google/Passkey 로그인 기반 콘텐츠 관리</p>
        </div>
        <button
          type="button"
          onClick={() => authClient.signOut()}
          className="rounded border border-[var(--border-color)] px-3 py-2 text-sm"
        >
          로그아웃
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {[
          ["activity", "활동"],
          ["exhibition", "전시"],
          ["photographer", "사진가"],
          ["link", "링크"],
          ["page", "페이지"],
          ["hero", "히어로"]
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              activeTab === id ? "bg-[var(--primary-color)] text-white" : "border border-[var(--border-color)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? <p className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p> : null}

      {activeTab === "activity" ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">활동 관리 ({activities.length})</h2>
            <button type="button" onClick={() => void addActivity()} className="rounded bg-[var(--primary-color)] px-3 py-2 text-white">
              새 활동 추가
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {activities.map((activity) => (
              <li key={activity.id} className="rounded border border-[var(--border-color)] p-3">
                {activity.title} · {activity.date}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "exhibition" ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">전시 관리 ({exhibitions.length})</h2>
            <button type="button" onClick={() => void addExhibition()} className="rounded bg-[var(--primary-color)] px-3 py-2 text-white">
              새 전시 추가
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {exhibitions.map((exhibition) => (
              <li key={exhibition.id} className="rounded border border-[var(--border-color)] p-3">
                {exhibition.title} · {exhibition.date}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "photographer" ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">사진가 관리 ({photographers.length})</h2>
            <button type="button" onClick={() => void addPhotographer()} className="rounded bg-[var(--primary-color)] px-3 py-2 text-white">
              새 사진가 추가
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {photographers.map((photographer) => (
              <li key={photographer.id} className="rounded border border-[var(--border-color)] p-3">
                {photographer.generation} · {photographer.name} ({photographer.type})
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "link" ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">링크트리 관리 ({links.length})</h2>
            <button type="button" onClick={() => void addLink()} className="rounded bg-[var(--primary-color)] px-3 py-2 text-white">
              새 링크 추가
            </button>
          </div>
          <ul className="space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.id} className="rounded border border-[var(--border-color)] p-3">
                [{link.category}] {link.name} - {link.url}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "hero" ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
          <h2 className="text-lg font-semibold">히어로 설정</h2>
          <input
            value={heroImageUrl}
            onChange={(event) => setHeroImageUrl(event.target.value)}
            className="w-full rounded border border-[var(--border-color)] px-3 py-2 text-sm"
            placeholder="배경 이미지 URL"
          />
          <button type="button" onClick={() => void saveHero()} className="rounded bg-[var(--primary-color)] px-3 py-2 text-white">
            히어로 저장
          </button>
        </section>
      ) : null}

      {activeTab === "page" ? (
        <section className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
          <h2 className="text-lg font-semibold">페이지 CMS (Tiptap)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["about", "recruiting", "donate", "supporters"] as SitePageSlug[]).map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setPageSlug(slug)}
                className="rounded border border-[var(--border-color)] px-3 py-2 text-left text-sm"
              >
                {slug}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">페이지 제목</label>
            <input
              value={pages[currentPageSlug].title}
              onChange={(event) =>
                setPages((prev) => ({
                  ...prev,
                  [currentPageSlug]: { ...prev[currentPageSlug], title: event.target.value }
                }))
              }
              className="w-full rounded border border-[var(--border-color)] px-3 py-2 text-sm"
            />
          </div>

          <RichTextEditor
            content={pages[currentPageSlug].contentJson as import("@tiptap/core").JSONContent}
            onChange={(next) =>
              setPages((prev) => ({
                ...prev,
                [currentPageSlug]: { ...prev[currentPageSlug], contentJson: next }
              }))
            }
          />

          <button type="button" onClick={() => void savePage(currentPageSlug)} className="rounded bg-[var(--primary-color)] px-3 py-2 text-white">
            페이지 저장
          </button>
        </section>
      ) : null}
    </div>
  );
}
