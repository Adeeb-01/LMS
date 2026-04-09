"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export function ConceptGapSummary({ gaps }) {
    const t = useTranslations("ReciteBack");

    if (!gaps || gaps.length === 0) return null;

    return (
        <Card className="w-full border-orange-500/20 bg-orange-500/5 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    {t("sessionSummaryTitle") || "Learning Session Summary"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {t("sessionSummarySubtext") || "We've identified a few concepts that might need more review based on your recitations."}
                </p>
            </CardHeader>
            <CardContent className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-3">
                    {gaps.map((gap) => (
                        <div 
                            key={gap.id} 
                            className="bg-background border border-orange-500/10 p-4 rounded-xl flex items-start gap-4 shadow-sm"
                        >
                            <div className="bg-orange-500/10 p-2 rounded-full shrink-0">
                                <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <p className="text-sm font-medium leading-relaxed">
                                    {gap.concept}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {new Date(gap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-full border border-orange-500/10">
                                        {gap.failureCount} {t("failedAttempts") || "Attempts"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground italic">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {t("reviewTip") || "Tip: You can re-watch the related video sections using the tutor's timestamp links."}
                </div>
            </CardContent>
        </Card>
    );
}
