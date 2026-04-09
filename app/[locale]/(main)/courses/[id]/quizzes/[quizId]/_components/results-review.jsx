"use client";

import { CheckCircle2, XCircle, Info, HelpCircle, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { OralAnswerStatus } from "@/components/questions/OralAnswerStatus";
import { WatchExplanationLink } from "@/components/alignment/watch-explanation-link";

export function ResultsReview({ review, courseId }) {
    const t = useTranslations("Quiz");

    if (!review || !review.questions) return null;

    return (
        <div className="space-y-8 mt-8" role="region" aria-labelledby="review-heading">
            <h2 id="review-heading" className="text-2xl font-bold border-b pb-2">{t("reviewAnswers")}</h2>
            
            <div className="space-y-6">
                {review.questions.map((question, index) => {
                    const isOral = question.type === "oral";
                    const isOralPending = isOral && question.oral && (question.oral.gradingStatus === "pending" || question.oral.gradingStatus === "evaluating");
                    const isCorrect = question.isCorrect;
                    const hasCorrectAnswer = !!question.correctAnswer;
                    const questionId = `question-${question._id}`;

                    return (
                        <div 
                            key={question._id} 
                            className={cn(
                                "border rounded-lg p-6 bg-white transition-all",
                                isOralPending ? "border-amber-200 bg-amber-50/30" :
                                isCorrect ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
                            )}
                            role="article"
                            aria-labelledby={`${questionId}-text`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-start gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm shrink-0" aria-hidden="true">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h3 id={`${questionId}-text`} className="text-lg font-medium">{question.text}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                                {question.points} {t("points")}
                                            </Badge>
                                            {isOral && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Mic className="w-3 h-3 me-1" />
                                                    {t("oral")}
                                                </Badge>
                                            )}
                                            {isOralPending ? (
                                                <Badge className="bg-amber-500 hover:bg-amber-600" role="status">
                                                    {t("gradingPending")}
                                                </Badge>
                                            ) : isCorrect ? (
                                                <Badge className="bg-green-600 hover:bg-green-700" role="status">
                                                    <CheckCircle2 className="w-3 h-3 me-1" aria-hidden="true" />
                                                    {t("correct")}
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" role="status">
                                                    <XCircle className="w-3 h-3 me-1" aria-hidden="true" />
                                                    {t("incorrect")}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Oral question review */}
                            {isOral && question.oral ? (
                                <div className="ms-11">
                                    <OralAnswerStatus
                                        oral={question.oral}
                                        questionPoints={question.points}
                                    />
                                    {question.sourceTimestamp && (
                                        <div className="mt-4">
                                            <WatchExplanationLink 
                                                courseId={courseId}
                                                lessonId={question.sourceTimestamp.lessonId}
                                                lessonSlug={question.sourceTimestamp.lessonSlug}
                                                startSeconds={question.sourceTimestamp.startSeconds}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                            <div className="space-y-3 ms-11" role="group" aria-label={t("options")}>
                                {question.options.map((option) => {
                                    const isSelected = question.studentAnswer.includes(option.id);
                                    const isCorrectOption = hasCorrectAnswer && question.correctAnswer.includes(option.id);
                                    
                                    let optionStatus = "default";
                                    if (isSelected && isCorrectOption) optionStatus = "correct-selected";
                                    else if (isSelected && !isCorrectOption && hasCorrectAnswer) optionStatus = "incorrect-selected";
                                    else if (!isSelected && isCorrectOption) optionStatus = "missed-correct";
                                    else if (isSelected && !hasCorrectAnswer) optionStatus = "selected";

                                    return (
                                        <div 
                                            key={option.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 border rounded-md text-sm",
                                                optionStatus === "correct-selected" && "border-green-500 bg-green-100/50 text-green-900",
                                                optionStatus === "incorrect-selected" && "border-red-500 bg-red-100/50 text-red-900",
                                                optionStatus === "missed-correct" && "border-green-500 border-dashed bg-green-50 text-green-900",
                                                optionStatus === "selected" && (isCorrect ? "border-green-500 bg-green-100/50" : "border-red-500 bg-red-100/50"),
                                                optionStatus === "default" && "border-slate-200 bg-white text-slate-600"
                                            )}
                                            aria-label={`${option.text}${isSelected ? `, ${t("yourAnswer")}` : ""}${isCorrectOption ? `, ${t("correctAnswer")}` : ""}`}
                                        >
                                            <div className="shrink-0" aria-hidden="true">
                                                {isSelected ? (
                                                    isCorrectOption || !hasCorrectAnswer ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    )
                                                ) : isCorrectOption ? (
                                                    <HelpCircle className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-slate-300" />
                                                )}
                                            </div>
                                            <span className="flex-1">{option.text}</span>
                                            {isSelected && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                                    {t("yourAnswer")}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}

                                {hasCorrectAnswer && question.explanation && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3">
                                        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-blue-900 mb-1">{t("explanation")}</p>
                                            <p className="text-sm text-blue-800 leading-relaxed mb-2">
                                                {question.explanation}
                                            </p>
                                            {question.sourceTimestamp && (
                                                <WatchExplanationLink 
                                                    courseId={courseId}
                                                    lessonId={question.sourceTimestamp.lessonId}
                                                    lessonSlug={question.sourceTimestamp.lessonSlug}
                                                    startSeconds={question.sourceTimestamp.startSeconds}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
