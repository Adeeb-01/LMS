"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

export function AbilityDistributionChart({ distribution }) {
    const t = useTranslations("Quiz");
    if (!distribution || !distribution.histogram) return null;

    const maxCount = Math.max(...distribution.histogram.map(h => h.count), 1);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">{t("abilityDistribution")}</CardTitle>
                <CardDescription>{t("distributionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-4">
                        <span>{t("mean")}: {distribution.mean.toFixed(2)}</span>
                        <span>{t("stdDev")}: {distribution.stdDev.toFixed(2)}</span>
                    </div>
                    <div className="flex items-end gap-1 h-48 border-b border-l p-2">
                        {distribution.histogram.map((item, idx) => (
                            <div 
                                key={idx} 
                                className="bg-blue-500 hover:bg-blue-600 transition-all flex-1 min-w-[8px]"
                                style={{ height: `${(item.count / maxCount) * 100}%` }}
                                role="img"
                                aria-label={`${item.range}: ${item.count} ${t("students")}`}
                                title={`${item.range}: ${item.count} ${t("students")}`}
                            />
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 px-1 mt-1">
                        <span>-4.0</span>
                        <span>-2.0</span>
                        <span>0.0</span>
                        <span>+2.0</span>
                        <span>+4.0</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
