import { ArrowRight, Link as LinkIcon } from "lucide-react";

import { ButtonLink } from "@/app/(dashboard)/_components/ui/button-link";
import { Card, CardHeader } from "@/app/(dashboard)/_components/ui/card";
import { EmptyState } from "@/app/(dashboard)/_components/ui/empty-state";
import {
  flattenLinktreeItems,
  listPublicLinktrees,
  safeList,
} from "@/features/public/services/public-read-service";

export default async function DashboardLinktreeOverview() {
  const linktrees = await safeList(listPublicLinktrees, []);
  const visibleGroups = linktrees.filter((group) => group.items.length > 0);
  const totalLinkCount = flattenLinktreeItems(visibleGroups).length;

  return (
    <Card
      data-testid="dashboard-linktree-overview"
      className="flex h-full min-w-0 flex-col"
    >
      <CardHeader
        title="홈페이지 링크 모음"
        description={`그룹 ${visibleGroups.length}개 · 링크 ${totalLinkCount}개가 공개돼 있습니다.`}
        actions={
          <ButtonLink
            href="/dashboard/settings/linktree"
            variant="utility"
            size="sm"
            trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            관리
          </ButtonLink>
        }
      />

      {visibleGroups.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            Icon={LinkIcon}
            accent="orange"
            title="공개된 링크가 없습니다"
            description="링크 모음을 추가하면 홈페이지 Linktree 페이지에 바로 노출됩니다."
            action={
              <ButtonLink href="/dashboard/settings/linktree/new" variant="primary">
                링크 모음 추가
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {visibleGroups.map((group) => (
            <article
              key={group.id}
              className="min-w-0 rounded-lg border border-hairline p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 truncate text-body-sm font-semibold text-ink">
                  {group.name}
                </h3>
                <span className="shrink-0 text-caption text-ink-muted tabular-nums">
                  {group.items.length}개
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md border border-hairline bg-surface-sunken px-3 py-2.5 transition-colors duration-150 hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) motion-reduce:transition-none"
                    >
                      <span className="block truncate text-body-sm font-medium text-ink">
                        {item.name}
                      </span>
                      {/* 링크 주소는 한 줄로 잘라 보여준다. truncate 는 nowrap 이라
                          부모가 min-w-0 이어야 실제로 줄어든다(모바일 가로 깨짐 방지). */}
                      <span className="mt-0.5 block truncate text-caption text-ink-muted">
                        {item.link}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
