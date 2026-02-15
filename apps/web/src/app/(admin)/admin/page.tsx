import LogoutButton from "./logout-button";

export default function AdminPage() {
  return (
    <main className="min-h-screen w-full p-4">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <LogoutButton />
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold">Admin Page</h1>
        </div>
      </section>
    </main>
  );
}
