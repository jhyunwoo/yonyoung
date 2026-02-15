import LinktreeAdminPage from "../../linktree/page";

type GenerationLinktreePageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationLinktreePage({
  params,
}: GenerationLinktreePageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  return (
    <LinktreeAdminPage
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
    />
  );
}

