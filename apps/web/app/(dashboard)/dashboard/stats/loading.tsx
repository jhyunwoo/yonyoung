import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import {
  CardSkeleton,
  PageHeaderSkeleton,
} from "@/app/(dashboard)/_components/ui/skeletons";

export default function StatsLoading() {
  return (
    <PageContainer data-testid="stats-loading">
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={`stats-loading-stat-${index + 1}`} />
        ))}
      </div>
      <CardSkeleton className="h-72" />
    </PageContainer>
  );
}
