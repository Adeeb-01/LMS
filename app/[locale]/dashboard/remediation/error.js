"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { AlertCircle } from "lucide-react";

/**
 * Route-level error boundary for the remediation dashboard (WCAG: recoverable error with actions).
 */
export default function RemediationError({ error, reset }) {
  const t = useTranslations("Remediation");
  const tCommon = useTranslations("Common");

  useEffect(() => {
    console.error("[RemediationDashboard]", error);
  }, [error]);

  return (
    <main
      className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8 sm:px-6"
      id="remediation-error"
      tabIndex={-1}
    >
      <div
        className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive"
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="h-6 w-6 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-foreground">{t("errorPageTitle")}</h1>
          <p className="mt-1 text-sm text-destructive/90">{t("errorPageDescription")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          {tCommon("retry")}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/remediation">{t("navLabel")}</Link>
        </Button>
      </div>
    </main>
  );
}
