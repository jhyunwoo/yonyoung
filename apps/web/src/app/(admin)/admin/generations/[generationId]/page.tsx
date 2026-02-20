import GenerationsAdminPage from "../page";

type GenerationDetailPageProps = {
  params: Promise<{ generationId: string }>;
};

export default async function GenerationDetailPage({ params }: GenerationDetailPageProps) {
  const { generationId } = await params;
  return (
    <GenerationsAdminPage
      basePath="/admin/generations"
      routeId={generationId}
      routeMode="detail"
    />
  );
}
