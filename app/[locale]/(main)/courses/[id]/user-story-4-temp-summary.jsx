"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Send } from "lucide-react";
import { useTranslations } from "next-intl";

export function QuizSummary({ 
    questions, 
    answers, 
    onSubmit, 
    onJumpToIndex,
    isSubmitting 
}) {
    const t = useTranslations("Quiz");
    const unansweredCount = questions.filter(q => !answers[q.id]).length;

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">{t("reviewAnswers")}</h2>
                <p className="text-slate-600">
                    {unansweredCount > 0 
                        ? `You have ${unansweredCount} unanswered question(s).` 
                        : "All questions answered. Ready to submit?"}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions.map((question, index) => {
                    const isAnswered = !!answers[question.id];
                    return (
                        <div 
                            key={question.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => onJumpToIndex(index)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-sm font-medium">
                                    {index + 1}
                                </div>
                                <span className="text-sm font-medium line-clamp-1">{question.text}</span>
                            </div>
                            {isAnswered ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                                <Circle className="w-5 h-5 text-slate-300" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center pt-6">
                <Button 
                    size="lg" 
                    className="w-full md:w-auto px-12"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? t("submitting") : t("submitQuiz")}
                    <Send className="w-4 h-4 ms-2 rtl:rotate-180" />
                </Button>
            </div>
        </div>
    );
}
