"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getQuizPoolAnalysis } from "@/app/actions/quizv2";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, BarChart3, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function PoolAnalysis({ quizId }) {
    const t = useTranslations("Quiz");
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            try {
                const result = await getQuizPoolAnalysis(quizId);
                if (result.ok) {
                    setAnalysis(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch pool analysis", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [quizId]);

    if (loading) {
        return (
            <Card className="mt-8">
                <CardHeader>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!analysis) return null;

    const {
        totalQuestions,
        questionsWithIRT,
        difficultyDistribution,
        discriminationQuality,
        recommendations,
        readyForAdaptive
    } = analysis;

    return (
        <Card className="mt-8">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                            {t("questionPoolAnalysis")}
                        </CardTitle>
                        <CardDescription>
                            {t("poolAnalysisDescription")}
                        </CardDescription>
                    </div>
                    <Badge variant={readyForAdaptive ? "success" : "warning"} className={readyForAdaptive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                        {readyForAdaptive ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> {t("ready")}</>
                        ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> {t("attentionNeeded")}</>
                        )}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border text-center">
                        <p className="text-sm text-slate-500">{t("totalQuestions")}</p>
                        <p className="text-2xl font-bold">{totalQuestions}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border text-center">
                        <p className="text-sm text-slate-500">{t("calibratedItems")}</p>
                        <p className="text-2xl font-bold">{questionsWithIRT}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border text-center">
                        <p className="text-sm text-slate-500">{t("readinessScore")}</p>
                        <p className="text-2xl font-bold">
                            {Math.round((questionsWithIRT / Math.max(1, totalQuestions)) * 100)}%
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Difficulty Distribution */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Target className="w-4 h-4 text-red-500" />
                            {t("difficultyDistribution")}
                        </h4>
                        <div className="space-y-3">
                            {Object.entries(difficultyDistribution).map(([key, count]) => (
                                <div key={key} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="capitalize">{t(key)}</span>
                                        <span className="font-medium">{count}</span>
                                    </div>
                                    <Progress 
                                        value={(count / Math.max(1, questionsWithIRT)) * 100} 
                                        className="h-1.5"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Discrimination Quality */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            {t("discriminationQuality")}
                        </h4>
                        <div className="space-y-3">
                            {Object.entries(discriminationQuality).map(([key, count]) => (
                                <div key={key} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="capitalize">{t(key)}</span>
                                        <span className="font-medium">{count}</span>
                                    </div>
                                    <Progress 
                                        value={(count / Math.max(1, questionsWithIRT)) * 100} 
                                        className="h-1.5"
                                        color={key === 'poor' ? 'bg-red-500' : 'bg-blue-500'}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            {t("recommendations")}
                        </h4>
                        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                            {recommendations.map((rec, i) => (
                                <li key={i}>
                                    {typeof rec === 'string' ? rec : (
                                        rec.key === 'difficultyGaps' ? (
                                            t(`adaptive.recommendations.${rec.key}`, { 
                                                gaps: rec.gaps.map(g => t(`adaptive.recommendations.${g}`)).join(` ${t("adaptive.recommendations.and")} `) 
                                            })
                                        ) : t(`adaptive.recommendations.${rec.key}`)
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
