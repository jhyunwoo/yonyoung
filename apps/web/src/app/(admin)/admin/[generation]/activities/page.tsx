import ActivitiesAdminPage from "../../activities/page";

type GenerationActivitiesPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationActivitiesPage({
  params,
}: GenerationActivitiesPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  return (
    <ActivitiesAdminPage
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
    />
  );
}

