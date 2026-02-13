type SitePageSlug = "about" | "recruiting" | "donate" | "supporters";

export interface SeedPage {
  slug: SitePageSlug;
  title: string;
  contentJson: unknown;
}

export const DEFAULT_PAGES: SeedPage[] = [
  {
    slug: "about",
    title: "연영회 소개",
    contentJson: {
      summary:
        "연영회는 1966년부터 이어져 온 연세대학교 중앙사진동아리로, 사진을 통해 세상을 기록하고 표현합니다.",
      timeline: [
        { month: "March", title: "리크루팅" },
        { month: "May", title: "대동제 보도 사진전" },
        { month: "June", title: "MT" },
        { month: "August", title: "정기 사진전" },
        { month: "October", title: "연고전 보도 사진전" },
        { month: "February", title: "신인 사진전" }
      ],
      history: [{ year: "1966", title: "연영회 창단" }]
    }
  },
  {
    slug: "recruiting",
    title: "리크루팅",
    contentJson: {
      sections: [
        {
          title: "모집 안내",
          body: "연영회는 연 1회, 3월 중 리크루팅을 실시합니다."
        }
      ]
    }
  },
  {
    slug: "donate",
    title: "후원 안내",
    contentJson: {
      sections: [
        {
          title: "후원 안내",
          body: "연영회는 여러분의 후원으로 더 나은 활동을 이어갈 수 있습니다."
        }
      ]
    }
  },
  {
    slug: "supporters",
    title: "서포터즈",
    contentJson: {
      sections: [{ title: "준비 중입니다.", body: "추후 업데이트 예정입니다." }]
    }
  }
];
