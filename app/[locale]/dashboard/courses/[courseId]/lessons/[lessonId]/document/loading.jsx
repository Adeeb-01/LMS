import { Skeleton } from "@/components/ui/skeleton";
import { DocumentSkeleton } from "@/components/documents/document-skeleton";

export default function DocumentLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="w-full">
          <Skeleton className="h-4 w-32 mb-6" />
          <div className="flex items-center gap-x-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto space-y-8">
        <DocumentSkeleton />
        <DocumentSkeleton />
      </div>
    </div>
  );
}
