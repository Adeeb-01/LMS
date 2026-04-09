"use client";

import { useEffect, useState } from "react";
import { getAdaptiveQuizAnalytics } from "@/app/actions/adaptive-analytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AbilityDistributionChart } from "./ability-distribution-chart";
import { QuestionUsageTable } from "./question-usage-table";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, HelpCircle, Clock, Target } from "lucide-react";

export function AdaptiveAnalyticsDashboard({ quizId }) {
    const t = useTranslations("Quiz");
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const result = await getAdaptiveQuizAnalytics(quizId);
                if (result.success) {
                    setAnalytics(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch adaptive analytics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [quizId]);

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!analytics || analytics.totalAttempts === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-slate-50 text-slate-500">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-lg font-semibold">{t("noAnalyticsYet")}</h3>
                <p className="text-sm">{t("noAnalyticsYetDescription")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("totalAttempts")}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalAttempts}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("avgQuestions")}</CardTitle>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.averageQuestionsToTermination.toFixed(1)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("avgDuration")}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.floor(analytics.averageTestDuration / 60)}m {Math.round(analytics.averageTestDuration % 60)}s
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t("avgAbility")}</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">θ={analytics.abilityDistribution.mean.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Distribution Chart */}
                <AbilityDistributionChart distribution={analytics.abilityDistribution} />

                {/* Termination Reasons */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">{t("terminationReasons")}</CardTitle>
                        <CardDescription>{t("terminationDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(analytics.terminationReasons).map(([reason, count]) => (
                                <div key={reason} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="capitalize">{t(reason)}</span>
                                        <span className="font-medium">{count} ({Math.round(count / analytics.totalAttempts * 100)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full ${
                                                reason === 'precision_achieved' ? 'bg-green-500' : 
                                                reason === 'max_reached' ? 'bg-amber-500' : 'bg-blue-500'
                                            }`}
                                            style={{ width: `${(count / analytics.totalAttempts) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Question Usage Table */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t("questionPerformance")}</h3>
                <QuestionUsageTable usage={analytics.questionUsage} />
            </div>
        </div>
    );
}
