import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";

export default async function RemediationLoading() {
  const t = await getTranslations("Remediation");

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 sm:px-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={t("loadingProfile")}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
      <p className="sr-only">{t("loadingProfile")}</p>
    </div>
  );
}
