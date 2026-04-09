"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";

export function BlockProgressIndicator({ current, total }) {
  const t = useTranslations("Quiz");
  const percentage = (current / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm font-medium text-slate-600">
        <span>{t("blockProgress", { current, total })}</span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
