"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { startOrResumeAttempt, autosaveAttempt, submitAttempt } from "@/app/actions/quizv2";
import { ChevronLeft, ChevronRight, Send, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { QuizTimer } from "./quiz-timer";
import { QuestionNavigator } from "./question-navigator";
import { QuizSummary } from "./quiz-summary";
import * as quizStorage from "@/lib/quiz-storage";

export function QuizTakingInterface({ quiz, courseId, existingAttemptId, isPreview }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("Quiz");
    const [isLoading, setIsLoading] = useState(!existingAttemptId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptId, setAttemptId] = useState(existingAttemptId);
    const [questions, setQuestions] = useState(quiz.questions || []);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [expiresAt, setExpiresAt] = useState(null);
    const [showSummary, setShowSummary] = useState(false);

    // Initialize attempt and load questions
    useEffect(() => {
        async function init() {
            if (existingAttemptId) {
                // Load existing attempt
                try {
                    const res = await fetch(`/api/quizv2/attempts/${existingAttemptId}`);
                    const data = await res.json();
                    if (data.ok) {
                        const attempt = data.attempt;
                        const serverExpiresAt = attempt.expiresAt ? new Date(attempt.expiresAt) : null;
                        setExpiresAt(serverExpiresAt);
                        
                        // Restore answers - check localStorage first
                        const localData = quizStorage.loadAnswers(existingAttemptId);
                        const hasNewerLocal = quizStorage.hasNewerAnswers(existingAttemptId, attempt.updatedAt);
                        
                        let answerMap = {};
                        if (hasNewerLocal && localData?.answers) {
                            answerMap = localData.answers;
                            // Sync newer local answers to server
                            autosaveAttempt(existingAttemptId, answerMap).catch(err => console.error("Sync failed:", err));
                        } else {
                            attempt.answers?.forEach(a => {
                                answerMap[a.questionId] = a.selectedOptionIds;
                            });
                        }
                        setAnswers(answerMap);

                        // Handle expired attempt
                        if (serverExpiresAt && serverExpiresAt < new Date()) {
                            toast.error(t("quizExpired"));
                            handleSubmit(true);
                        }
                    }
                } catch (error) {
                    toast.error(t("failedToLoadAttempt"));
                }
                setIsLoading(false);
                return;
            }

            // Start new attempt
            try {
                const result = await startOrResumeAttempt(quiz.id);
                if (result.ok) {
                    setAttemptId(result.attemptId);
                    
                    // Load attempt to get expiresAt
                    const res = await fetch(`/api/quizv2/attempts/${result.attemptId}`);
                    const data = await res.json();
                    if (data.ok && data.attempt.expiresAt) {
                        const expires = new Date(data.attempt.expiresAt);
                        setExpiresAt(expires);
                    }
                } else {
                    toast.error(result.error || t("failedToStartQuiz"));
                    router.push(`/courses/${courseId}/quizzes`);
                }
            } catch (error) {
                toast.error(t("failedToStartQuiz"));
                router.push(`/courses/${courseId}/quizzes`);
            } finally {
                setIsLoading(false);
            }
        }
        init();
    }, [existingAttemptId, quiz.id, courseId, router]);

    // Shuffled questions logic
    useEffect(() => {
        if (questions.length === 0) return;
        
        let ordered = [...questions];
        if (quiz.shuffleQuestions) {
            ordered = ordered.sort(() => Math.random() - 0.5);
        }
        
        if (quiz.shuffleOptions) {
            ordered = ordered.map(q => ({
                ...q,
                options: [...q.options].sort(() => Math.random() - 0.5)
            }));
        }
        
        setShuffledQuestions(ordered);
    }, [questions, quiz.shuffleQuestions, quiz.shuffleOptions]);

    // Autosave
    useEffect(() => {
        if (!attemptId || Object.keys(answers).length === 0 || isPreview) return;
        
        // Backup to localStorage immediately
        quizStorage.saveAnswers(attemptId, {
            answers,
            quizId: quiz.id,
            expiresAt: expiresAt?.toISOString()
        });

        const autosaveTimer = setTimeout(() => {
            autosaveAttempt(attemptId, answers).catch(err => console.error("Autosave failed:", err));
        }, 5000);

        return () => clearTimeout(autosaveTimer);
    }, [answers, attemptId, isPreview, quiz.id, expiresAt]);

    const currentQuestion = useMemo(
        () => shuffledQuestions[currentIndex],
        [shuffledQuestions, currentIndex]
    );

    const handleAnswerChange = useCallback((questionId, value, isMultiple = false) => {
        setAnswers((prev) => {
            if (isMultiple) {
                const current = prev[questionId] || [];
                const valueSet = new Set(current);
                if (valueSet.has(value)) {
                    valueSet.delete(value);
                } else {
                    valueSet.add(value);
                }
                return { ...prev, [questionId]: Array.from(valueSet) };
            } else {
                return { ...prev, [questionId]: value };
            }
        });
    }, []);

    const handleSubmit = useCallback(async (autoSubmit = false) => {
        if (isSubmitting || !attemptId) return;

        if (!autoSubmit && !showSummary) {
            const unanswered = shuffledQuestions.filter(q => !answers[q.id]);
            if (unanswered.length > 0) {
                const proceed = window.confirm(
                    t("unansweredQuestions", { count: unanswered.length }) + " " + t("submitAnyway")
                );
                if (!proceed) return;
            }
        }

        setIsSubmitting(true);

        try {
            const result = await submitAttempt(attemptId, answers);

            if (result.ok) {
                quizStorage.clearAnswers(attemptId);
                toast.success(result.attempt.passed ? t("quizPassed") : t("quizSubmitted"));
                router.push(
                    `/courses/${courseId}/quizzes/${quiz.id}/result?attemptId=${attemptId}`
                );
            } else {
                toast.error(result.error || t("failedToSubmit"));
            }
        } catch (error) {
            toast.error(t("failedToSubmit"));
        } finally {
            setIsSubmitting(false);
        }
    }, [attemptId, answers, courseId, isSubmitting, shuffledQuestions, quiz.id, router]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-600">{t("isLoading")}</p>
                </div>
            </div>
        );
    }

    if (shuffledQuestions.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-600">{t("noQuestionsFound")}</p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push(`/courses/${courseId}/quizzes`)}
                >
                    {t("backToQuizzes")}
                </Button>
            </div>
        );
    }

    const handleJumpToIndex = useCallback((index) => {
        setCurrentIndex(index);
        setShowSummary(false);
        // Focus management: scroll to top of question area
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const renderQuestion = () => {
        const questionId = currentQuestion.id;
        const currentAnswer = answers[questionId];
        const isMultiple = currentQuestion.type === "multi";

        if (currentQuestion.type === "true_false") {
            // For true/false, use the actual option IDs from the question
            const trueOption = currentQuestion.options.find(opt => opt.text.toLowerCase() === "true" || opt.id.toLowerCase() === "true");
            const falseOption = currentQuestion.options.find(opt => opt.text.toLowerCase() === "false" || opt.id.toLowerCase() === "false");
            
            return (
                <RadioGroup
                    value={currentAnswer || ""}
                    onValueChange={(value) => handleAnswerChange(questionId, value)}
                >
                    {trueOption && (
                        <div className="flex items-center gap-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={trueOption.id} id="true" />
                            <Label htmlFor="true" className="flex-1 cursor-pointer">{trueOption.text || "True"}</Label>
                        </div>
                    )}
                    {falseOption && (
                        <div className="flex items-center gap-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <RadioGroupItem value={falseOption.id} id="false" />
                            <Label htmlFor="false" className="flex-1 cursor-pointer">{falseOption.text || "False"}</Label>
                        </div>
                    )}
                </RadioGroup>
            );
        }

        return (
            <div className="space-y-2">
                {isMultiple && (
                    <p className="text-sm text-slate-500 mb-2">{t("selectAllThatApply")}</p>
                )}
                {isMultiple ? (
                    currentQuestion.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-x-3 p-3 border rounded-lg hover:bg-slate-50">
                            <Checkbox
                                id={`opt-${idx}`}
                                checked={(currentAnswer || []).includes(option.id)}
                                onCheckedChange={() => handleAnswerChange(questionId, option.id, true)}
                            />
                            <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer">
                                {option.text}
                            </Label>
                        </div>
                    ))
                ) : (
                    <RadioGroup
                        value={currentAnswer || ""}
                        onValueChange={(value) => handleAnswerChange(questionId, value)}
                    >
                        {currentQuestion.options.map((option, idx) => (
                            <div key={idx} className="flex items-center gap-x-3 p-3 border rounded-lg hover:bg-slate-50">
                                <RadioGroupItem value={option.id} id={`opt-${idx}`} />
                                <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer">
                                    {option.text}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-xl font-bold">{quiz.title}</h1>
                    {isPreview && (
                        <Badge variant="secondary" className="mt-1">
                            {t("previewMode")}
                        </Badge>
                    )}
                </div>
                {expiresAt && (
                    <QuizTimer 
                        expiresAt={expiresAt} 
                        onExpire={() => handleSubmit(true)} 
                    />
                )}
            </div>

            {/* Question Navigator */}
            <div className="bg-slate-50 p-4 rounded-lg border">
                <QuestionNavigator 
                    questions={shuffledQuestions}
                    currentIndex={showSummary ? -1 : currentIndex}
                    answers={answers}
                    onJumpToIndex={handleJumpToIndex}
                />
            </div>

            {showSummary ? (
                <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <QuizSummary 
                        questions={shuffledQuestions}
                        answers={answers}
                        onSubmit={() => handleSubmit(false)}
                        onJumpToIndex={handleJumpToIndex}
                        isSubmitting={isSubmitting}
                    />
                </div>
            ) : (
                <>
                    {/* Progress */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                            {t("questionOf", { current: currentIndex + 1, total: shuffledQuestions.length })}
                        </span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${((currentIndex + 1) / shuffledQuestions.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Question */}
                    <div className="border rounded-lg p-6 bg-white">
                        <div className="flex items-start justify-between mb-4">
                            <h2 className="text-lg font-medium">{currentQuestion.text}</h2>
                            <Badge variant="outline">{currentQuestion.points} pts</Badge>
                        </div>

                        {renderQuestion()}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                            disabled={currentIndex === 0}
                        >
                            <ChevronLeft className="w-4 h-4 me-2 rtl:rotate-180" />
                            {t("previous")}
                        </Button>

                        <div className="flex gap-2">
                            {!isPreview && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        autosaveAttempt(attemptId, answers).then(() => toast.success(t("autoSaved")));
                                    }}
                                >
                                    <Save className="w-4 h-4 me-2" />
                                    {t("save")}
                                </Button>
                            )}

                            {currentIndex === shuffledQuestions.length - 1 ? (
                                <Button
                                    onClick={() => setShowSummary(true)}
                                    disabled={isSubmitting || isPreview}
                                >
                                    <ChevronRight className="w-4 h-4 me-2 rtl:rotate-180" />
                                    {t("next")}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setCurrentIndex(Math.min(shuffledQuestions.length - 1, currentIndex + 1))}
                                >
                                    {t("next")}
                                    <ChevronRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                                </Button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
