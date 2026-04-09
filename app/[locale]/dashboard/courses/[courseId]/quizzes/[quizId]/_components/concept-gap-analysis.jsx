"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { AlertCircle, Users, BarChart3 } from "lucide-react";

export function ConceptGapAnalysis({ quizId, initialData }) {
  const t = useTranslations("Quiz");
  const { totalAttempts, missedConcepts } = initialData;

  if (totalAttempts === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">{t("noAnalyticsYet")}</h3>
          <p className="text-slate-500">{t("noAnalyticsYetDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("totalAttempts")}
            </CardDescription>
            <CardTitle className="text-2xl">{totalAttempts}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              {t("topMissedConcepts")}
            </CardDescription>
            <CardTitle className="text-2xl">
              {missedConcepts.length > 0 ? missedConcepts[0].name : "None"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("conceptGapAnalysis")}</CardTitle>
          <CardDescription>
            {t("conceptGapAnalysisDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {missedConcepts.map((concept, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{concept.name}</span>
                    <Badge variant="outline" className="text-[10px] py-0">
                      {concept.count} {t("students")}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {Math.round(concept.percentage)}%
                  </span>
                </div>
                <Progress 
                  value={concept.percentage} 
                  className="h-2 bg-slate-100" 
                  indicatorClassName={idx === 0 ? "bg-red-500" : "bg-amber-500"}
                />
              </div>
            ))}

            {missedConcepts.length === 0 && (
              <div className="text-center py-8 text-slate-500 italic">
                {t("noMissedConcepts")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
