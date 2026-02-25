export default function DashboardPage() {
  return (
    <main className="px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Dashboard Home</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 md:text-3xl">연영회 내부 Dashboard</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            좌측 사이드바에서 기수를 선택하면 해당 기수의 활동, 전시, 멤버 관리 메뉴를 확인할 수 있습니다.
          </p>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Welcome</p>
          <h2 className="mt-3 text-xl font-bold text-slate-900">연영회에 오신 것을 환영합니다.</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            사이드바에서 원하는 기수를 선택해 내부 관리 작업을 시작해 주세요.
          </p>
        </aside>
      </div>
    </main>
  );
}
