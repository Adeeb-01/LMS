import { getWeaknessProfile } from "@/app/actions/remediation";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { getEnrollmentsForUser } from "@/queries/enrollments";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeaknessList } from "./_components/weakness-list";
import { ResolvedSection } from "./_components/resolved-section";
import { AlertCircle, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RemediationDashboardPage({ searchParams }) {
  const t = await getTranslations("Remediation");
  const user = await getLoggedInUser();
  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const courseId = typeof sp.courseId === "string" ? sp.courseId : undefined;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(sp.limit || "10"), 10) || 10));

  if (!courseId) {
    const enrollments = await getEnrollmentsForUser(user.id);
    return (
      <main
        id="remediation-dashboard"
        className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6"
        aria-labelledby="remediation-title"
      >
        <div>
          <h1 id="remediation-title" className="text-2xl font-bold">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("selectCoursePrompt")}</p>
        </div>
        {enrollments?.length ? (
          <ul className="grid gap-3 list-none p-0 m-0 sm:grid-cols-2">
            {enrollments.map((en) => {
              const cid = en.course?.id ?? en.course?._id;
              const title = en.course?.title ?? "Course";
              if (!cid) return null;
              return (
                <li key={String(cid)}>
                  <Card className="h-full hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription>{t("pageDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild>
                        <Link href={`/dashboard/remediation?courseId=${encodeURIComponent(String(cid))}`}>
                          <BookOpen className="h-4 w-4 me-2" aria-hidden />
                          {t("navLabel")}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("emptyTitle")}</CardTitle>
              <CardDescription>{t("emptyDescription")}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>
    );
  }

  const result = await getWeaknessProfile({ courseId, status: "active", page, limit });

  if (!result.success) {
    return (
      <main
        id="remediation-dashboard"
        className="mx-auto max-w-2xl px-4 py-6 sm:px-6"
        aria-labelledby="remediation-title"
      >
        <div
          className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-6 w-6 shrink-0" aria-hidden />
          <div>
            <p id="remediation-title" className="font-medium">
              {t("errorLoad")}
            </p>
            <p className="mt-1 text-sm opacity-90">{result.error?.message}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/dashboard/remediation">{t("navLabel")}</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const { items, pagination, stats, lastAggregatedAt, emptyReason, resolvedItems, sourceSummary } =
    result.data;

  const showAllClear =
    emptyReason === "no_weaknesses" && (sourceSummary.batAttemptCount > 0 || sourceSummary.oralResponseTotal > 0);

  const showEmptyOnboarding = emptyReason === "no_assessment_history";

  const loadMoreHref =
    pagination.total > limit && limit < 50
      ? `/dashboard/remediation?courseId=${encodeURIComponent(courseId)}&page=1&limit=50`
      : null;

  return (
    <main
      id="remediation-dashboard"
      className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6"
      aria-labelledby="remediation-title"
    >
      <header className="space-y-1">
        <h1 id="remediation-title" className="text-2xl font-bold">
          {t("pageTitle")}
        </h1>
        <p className="text-muted-foreground">{t("pageDescription")}</p>
        {lastAggregatedAt && (
          <p className="text-xs text-muted-foreground">
            {t("lastUpdated")}: {new Date(lastAggregatedAt).toLocaleString()}
          </p>
        )}
      </header>

      {items.length > 0 && stats.averagePriority > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("priorityLabel")}: ~{Math.round(stats.averagePriority)} / 100
        </p>
      )}

      {showEmptyOnboarding && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyDescription")}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {showAllClear && !items.length && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle>{t("allClearTitle")}</CardTitle>
            <CardDescription>{t("allClearDescription")}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {items.length > 0 && (
        <WeaknessList courseId={courseId} items={items} pagination={pagination} />
      )}

      {loadMoreHref && (
        <div className="flex justify-center">
          <Button variant="outline" asChild>
            <Link href={loadMoreHref}>{t("loadMore")}</Link>
          </Button>
        </div>
      )}

      <ResolvedSection items={resolvedItems} />

      <div className="pt-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/remediation">{t("changeCourse")}</Link>
        </Button>
      </div>
    </main>
  );
}
