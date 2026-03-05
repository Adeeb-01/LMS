"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export const PublishChecklist = ({ missing = [] }) => {
  const t = useTranslations("CoursePublish");

  if (missing.length === 0) return null;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-x-2 text-slate-700 dark:text-slate-300 font-medium">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        {t("checklistTitle")}
      </div>
      <div className="space-y-2">
        {missing.map((error, index) => (
          <div key={index} className="flex items-center gap-x-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {t(`errors.${error.replace(/\s+/g, '')}`, { defaultValue: error })}
          </div>
        ))}
      </div>
    </div>
  );
};
