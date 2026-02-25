import { notFound } from "next/navigation";
import { serverAuthTool } from "../../../../../../lib/auth-server-tool";
import { requireDashboardGeneration } from "../../_lib/resolve-generation";
import MemberDetailClient from "./member-detail-client";

const decodeMemberId = (rawMemberId: string): string | null => {
  const trimmedMemberId = rawMemberId.trim();
  if (trimmedMemberId.length === 0) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(trimmedMemberId).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
};

export default async function GenerationMemberDetailPage({
  params,
}: Readonly<{
  params: Promise<{ generationName: string; memberId: string }>;
}>) {
  const [{ memberId: rawMemberId }, generation, session] = await Promise.all([
    params,
    requireDashboardGeneration(params),
    serverAuthTool.requireSession(),
  ]);

  const memberId = decodeMemberId(rawMemberId);
  if (!memberId) {
    notFound();
  }

  return (
    <MemberDetailClient
      generation={generation}
      memberId={memberId}
      viewer={{
        id: session.user.id,
        role: session.user.role ?? null,
      }}
    />
  );
}
