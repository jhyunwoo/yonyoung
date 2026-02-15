import SupportersAdminPage from "../../supporters/page";

type GenerationSupportersPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationSupportersPage({
  params,
}: GenerationSupportersPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  return (
    <SupportersAdminPage
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
    />
  );
}

