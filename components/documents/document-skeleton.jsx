import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DocumentSkeleton = () => {
  return (
    <Card className="w-full mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-8 w-[40%] mt-6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
};
