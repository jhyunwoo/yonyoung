import { PageContainer } from "@/app/(dashboard)/_components/ui/layout-parts";
import {
  CardSkeleton,
  PageHeaderSkeleton,
} from "@/app/(dashboard)/_components/ui/skeletons";

export default function SettingsLoading() {
  return (
    <PageContainer data-testid="settings-loading">
      <PageHeaderSkeleton />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={`settings-loading-card-${index + 1}`} />
        ))}
      </div>
    </PageContainer>
  );
}
