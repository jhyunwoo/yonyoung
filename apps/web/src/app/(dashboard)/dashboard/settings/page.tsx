import Link from "next/link";

const settingsItems = [
  {
    title: "전체 공지 관리",
    description: "전체 공지를 작성하고 수정합니다.",
    href: "/dashboard/settings/notices",
  },
  {
    title: "Linktree 관리",
    description: "링크트리 항목을 관리합니다.",
    href: "/dashboard/settings/linktree",
  },
  {
    title: "후원사 관리",
    description: "후원사 정보를 관리합니다.",
    href: "/dashboard/settings/supporters",
  },
  {
    title: "전체 멤버 관리",
    description: "모든 기수의 멤버를 통합 관리합니다.",
    href: "/dashboard/settings/members",
  },
];

export default function SettingsPage() {
  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <section className="mx-auto w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Settings</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">대시보드 설정</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
          설정 메뉴에서 전체 공지, Linktree, 후원사, 전체 멤버를 관리할 수 있습니다.
        </p>

        <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {settingsItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
