import UsersAdminPage from "../../users/page";

type GenerationUsersPageProps = {
  params: Promise<{ generation: string }>;
};

export default async function GenerationUsersPage({
  params,
}: GenerationUsersPageProps) {
  const { generation } = await params;
  const generationSortOrder = Number.parseInt(generation, 10);

  return (
    <UsersAdminPage
      generationSortOrder={Number.isFinite(generationSortOrder) ? generationSortOrder : null}
      generationScoped
    />
  );
}

