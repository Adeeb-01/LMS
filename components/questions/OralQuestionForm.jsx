"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OralQuestionForm({ referenceAnswer, onChange }) {
  const t = useTranslations("Quiz");

  return (
    <div className="space-y-4">
      <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
        {t("oralQuestionNote")}
      </div>
      <div className="space-y-2">
        <Label htmlFor="referenceAnswer" className="flex items-center gap-1">
          {t("referenceAnswer")}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="referenceAnswer"
          placeholder={t("referenceAnswerPlaceholder")}
          value={referenceAnswer}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
}
