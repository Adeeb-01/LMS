import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardList, Mic } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ReviewConceptButton } from "./remediation-player";
import { cn } from "@/lib/utils";

export async function WeaknessCard({ item }) {
  const t = await getTranslations("Remediation");
  const hasBat = item.sources.some((s) => s.type === "bat");
  const hasOral = item.sources.some((s) => s.type === "oral");
  const viewed = !!item.viewedAt;
  const score = Math.min(100, Math.max(0, Math.round(Number(item.priorityScore) || 0)));
  const priorityBarClass =
    score >= 67 ? "bg-rose-500/90" : score >= 34 ? "bg-amber-500/90" : "bg-slate-400/80";

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{item.conceptTag}</CardTitle>
              {viewed && (
                <Badge variant="outline" className="font-normal text-emerald-700 border-emerald-200 bg-emerald-50">
                  {t("viewed")}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 flex flex-wrap gap-2">
              {hasBat && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                  {t("sourceBat")}
                </Badge>
              )}
              {hasOral && (
                <Badge variant="outline" className="gap-1 font-normal">
                  <Mic className="h-3.5 w-3.5" aria-hidden />
                  {t("sourceOral")}
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="text-end text-sm text-muted-foreground min-w-[140px]">
            <div>
              {t("priorityLabel")}:{" "}
              <span className="font-medium text-foreground">{score}</span>
            </div>
            <div
              className="mt-2 ms-auto w-full max-w-[160px]"
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("priorityMeterAria", { score })}
            >
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", priorityBarClass)}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <p className="text-sm text-muted-foreground">
          {t("failureCount", { count: item.failureCount })}
        </p>
        <ReviewConceptButton item={item} />
      </CardContent>
    </Card>
  );
}
