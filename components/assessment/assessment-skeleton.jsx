import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AssessmentSkeleton() {
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-primary/20 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 py-4">
        <div className="bg-muted p-6 rounded-xl border border-border/50">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-[90%] mb-2" />
          <Skeleton className="h-4 w-[95%]" />
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="border rounded-lg p-6 bg-slate-50/50 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </CardFooter>
    </Card>
  );
}

export function TutorSkeleton() {
  return (
    <Card className="flex flex-col h-[600px] shadow-xl border-primary/20 bg-background/95 backdrop-blur">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-20 w-[70%] rounded-2xl rounded-tl-none" />
        </div>
        <div className="flex gap-3 flex-row-reverse">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-12 w-[60%] rounded-2xl rounded-tr-none" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-24 w-[80%] rounded-2xl rounded-tl-none" />
        </div>
      </CardContent>
      <CardFooter className="border-t p-3 flex flex-col gap-3">
        <Skeleton className="h-8 w-32 rounded-lg self-start" />
        <div className="flex w-full gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardFooter>
    </Card>
  );
}
