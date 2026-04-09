import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading UI for {@link ClassWeaknessAnalytics} when wrapped in Suspense. */
export function ClassWeaknessAnalyticsSkeleton() {
  return (
    <Card className="mt-10" aria-busy="true" aria-live="polite">
      <CardHeader>
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-40 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}
