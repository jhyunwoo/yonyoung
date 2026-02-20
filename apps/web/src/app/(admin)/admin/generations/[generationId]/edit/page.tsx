import GenerationsAdminPage from "../../page";

type GenerationEditPageProps = {
  params: Promise<{ generationId: string }>;
};

export default async function GenerationEditPage({ params }: GenerationEditPageProps) {
  const { generationId } = await params;
  return (
    <GenerationsAdminPage
      basePath="/admin/generations"
      routeId={generationId}
      routeMode="edit"
    />
  );
}
