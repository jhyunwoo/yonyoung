import Link from "next/link";

type GenerationEntryPageProps = {
  params: Promise<{ generation: string }>;
};

const RESOURCE_LINKS = [
  { href: "activities", label: "Activities" },
  { href: "supporters", label: "Supporters (Global)" },
  { href: "exhibitions", label: "Exhibitions" },
  { href: "linktree", label: "Linktree (Global)" },
  { href: "users", label: "Users" },
] as const;

/**
 * GenerationEntryPage 컴포넌트의 화면 구조와 상태 기반 렌더링 로직을 정의합니다.
 * @param {
  params,
} 동작 분기를 제어하는 파라미터입니다.
 * @returns 렌더링할 JSX 트리를 반환합니다.
 * @remarks UI 상태와 권한 조건이 변경될 때 렌더링 분기가 달라질 수 있습니다.
 */
export default async function GenerationEntryPage({
  params,
}: GenerationEntryPageProps) {
  const { generation } = await params;

  return (
    <main className="space-y-6" data-testid="generation-entry-page">
      <header className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Generation {generation}</h1>
        <p className="mt-1 text-sm text-gray-600">
          아래 리소스 메뉴에서 해당 기수 기준 데이터를 관리할 수 있습니다.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RESOURCE_LINKS.map(/** RESOURCE_LINKS.map 실행 과정에서 필요한 연산을 수행하는 콜백 함수입니다. @param item 반복 처리 중인 현재 항목입니다. @returns 함수 실행 결과를 반환합니다. @remarks 상위 함수의 호출 시점과 조건에 따라 실행 순서가 달라질 수 있습니다. */ (item) => (
          <Link
            key={item.href}
            href={`/admin/${generation}/${item.href}`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
            data-testid={`generation-entry-link-${item.href}`}
          >
            {item.label}
          </Link>
        ))}
      </section>
    </main>
  );
}

