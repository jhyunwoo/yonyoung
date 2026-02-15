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
        {RESOURCE_LINKS.map((item) => (
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

