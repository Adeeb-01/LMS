"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function AbilityIndicator({ theta, percentile, label, className }) {
  const t = useTranslations("Quiz.adaptive.abilityLevels");

  // Map label to color/variant
  const variants = {
    "Novice": "bg-slate-500",
    "Developing": "bg-blue-500",
    "Proficient": "bg-green-500",
    "Advanced": "bg-purple-500",
    "Expert": "bg-amber-500"
  };

  const variantClass = variants[label] || "bg-slate-500";

  return (
    <div className={cn("flex flex-col gap-2 p-3 border rounded-lg bg-white shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          {t("label") || "Estimated Ability"}
        </span>
        <Badge className={cn("text-white border-none", variantClass)}>
          {t(label) || label}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{t("percentile", { percentile: Math.round(percentile) })}</span>
          <span>θ: {theta.toFixed(2)}</span>
        </div>
        <Progress value={percentile} className="h-1.5" />
      </div>
    </div>
  );
}
