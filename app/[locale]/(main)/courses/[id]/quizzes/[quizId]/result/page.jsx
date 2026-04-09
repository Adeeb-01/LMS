import { getLoggedInUser } from "@/lib/loggedin-user";
import { getQuizResultWithReview } from "@/app/actions/quizv2";
import { getAdaptiveResult } from "@/app/actions/adaptive-quiz";
import { getBatResult } from "@/app/actions/bat-quiz";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, History, ArrowLeft, Trophy, AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResultsReview } from "../_components/results-review";
import { AdaptiveResults } from "../_components/adaptive-results";
import { BatResults } from "../_components/bat-results";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function QuizResultPage({ params, searchParams }) {
    const { id: courseId, quizId } = await params;
    const resolvedSearchParams = await searchParams;
    const attemptId = resolvedSearchParams.attemptId;
    const t = await getTranslations("Quiz");

    const user = await getLoggedInUser();
    if (!user) {
        redirect("/login");
    }

    if (!attemptId) {
        redirect(`/courses/${courseId}/quizzes`);
    }

    // Try standard result first, but check if it's adaptive
    const standardResponse = await getQuizResultWithReview(attemptId);
    
    if (!standardResponse.ok) {
        if (standardResponse.error === "Unauthorized") {
            redirect(`/courses/${courseId}/quizzes`);
        }
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">{t("error")}</h1>
                <p className="text-slate-600 mb-6">{standardResponse.error}</p>
                <Link href={`/courses/${courseId}/quizzes`}>
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 me-2" />
                        {t("backToQuizzes")}
                    </Button>
                </Link>
            </div>
        );
    }

    const { attempt, quiz, review, attemptHistory } = standardResponse.result;

    // Check if it's an adaptive attempt
    const isAdaptive = attempt.adaptive?.enabled;
    const isBat = attempt.bat?.enabled;
    let adaptiveData = null;
    let batData = null;

    if (isAdaptive) {
        const adaptiveRes = await getAdaptiveResult(attemptId);
        if (adaptiveRes.success) {
            adaptiveData = adaptiveRes.data;
        }
    } else if (isBat) {
        const batRes = await getBatResult(attemptId);
        if (batRes.success) {
            batData = batRes.data;
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">{quiz.title}</h1>
                    <p className="text-slate-500 mt-1">{t("result")}</p>
                </div>
                <Link href={`/courses/${courseId}/quizzes`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 me-2" />
                        {t("backToQuizzes")}
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Results Column */}
                <div className="lg:col-span-2 space-y-8">
                    {isAdaptive && adaptiveData ? (
                        <AdaptiveResults data={adaptiveData} courseId={courseId} />
                    ) : isBat && batData ? (
                        <BatResults attemptData={batData} quiz={quiz} />
                    ) : (
                        <>
                            {/* Score Card */}
                            <div className={cn(
                                "relative overflow-hidden border rounded-2xl p-8 text-center transition-all",
                                attempt.passed ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                            )}>
                                {attempt.passed && (
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Trophy className="w-24 h-24 text-green-600" />
                                    </div>
                                )}
                                
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-4">
                                    {attempt.passed ? (
                                        <CheckCircle className="w-10 h-10 text-green-600" />
                                    ) : (
                                        <XCircle className="w-10 h-10 text-red-600" />
                                    )}
                                </div>

                                <h2 className="text-xl font-bold mb-1">
                                    {attempt.passed ? t("passed") : t("notPassed")}
                                </h2>
                                
                                <div className="text-5xl font-black my-4 tracking-tighter">
                                    {attempt.scorePercent?.toFixed(1) || 0}%
                                </div>

                                <div className="flex items-center justify-center gap-4 text-sm font-medium text-slate-600">
                                    <span className="flex items-center">
                                        <Clock className="w-4 h-4 me-1.5 opacity-60" />
                                        {new Date(attempt.submittedAt).toLocaleDateString()}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span>
                                        {t("passPercentage")}: {quiz.passPercent}%
                                    </span>
                                </div>
                            </div>

                            {/* Answer Review */}
                            {review ? (
                                <ResultsReview review={review} courseId={courseId} />
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                                        {t("reviewAnswers")}
                                    </h3>
                                    <p className="text-slate-500 max-w-md mx-auto">
                                        {quiz.showAnswersPolicy === "after_pass" 
                                            ? t("answersHiddenAfterPass")
                                            : t("never")}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Attempt History */}
                    <div className="border rounded-2xl bg-white overflow-hidden shadow-sm">
                        <div className="p-4 border-b bg-slate-50/50 flex items-center gap-2">
                            <History className="w-4 h-4 text-slate-500" />
                            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">
                                {t("attemptHistory")}
                            </h3>
                        </div>
                        <div className="divide-y">
                            {attemptHistory.length > 0 ? (
                                attemptHistory.map((hist, idx) => (
                                    <div 
                                        key={hist._id} 
                                        className={cn(
                                            "p-4 flex items-center justify-between transition-colors",
                                            hist._id === attempt._id ? "bg-primary/5" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-500">
                                                {new Date(hist.submittedAt).toLocaleDateString()}
                                            </span>
                                            <span className="font-bold text-sm">
                                                {hist.scorePercent?.toFixed(1)}%
                                            </span>
                                        </div>
                                        <Badge 
                                            variant={hist.passed ? "default" : "destructive"}
                                            className={cn(
                                                "text-[10px] px-2 py-0 h-5",
                                                hist.passed && "bg-green-600 hover:bg-green-700"
                                            )}
                                        >
                                            {hist.passed ? t("passed") : t("notPassed")}
                                        </Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    {t("noAttemptsYet")}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="border rounded-2xl p-6 bg-slate-900 text-white space-y-4">
                        <h3 className="font-bold text-lg">{t("nextSteps")}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {attempt.passed 
                                ? t("nextStepsPassedDesc")
                                : t("nextStepsFailedDesc")}
                        </p>
                        <div className="pt-2 space-y-2">
                            {!attempt.passed && (
                                <Link href={`/courses/${courseId}/quizzes/${quiz._id}`} className="block">
                                    <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none">
                                        {t("start")}
                                    </Button>
                                </Link>
                            )}
                            <Link href={`/courses/${courseId}/quizzes`} className="block">
                                <Button variant="outline" className="w-full border-slate-700 text-white hover:bg-slate-800">
                                    {t("backToQuizzes")}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
