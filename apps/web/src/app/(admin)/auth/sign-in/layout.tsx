import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { fetchSessionFromApi } from "../../../../lib/auth-server";

export default async function SignInRedirectLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const session = await fetchSessionFromApi(cookieHeader || null);

  if (session) {
    redirect("/admin");
  }

  return children;
}
