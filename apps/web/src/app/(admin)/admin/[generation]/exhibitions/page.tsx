import ExhibitionsAdminPage from "../../exhibitions/page";

type GenerationExhibitionsPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationExhibitionsPage({
  params,
}: GenerationExhibitionsPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  return (
    <ExhibitionsAdminPage
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
    />
  );
}

