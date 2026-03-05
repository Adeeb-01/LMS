"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function QuestionNavigator({ 
    questions, 
    currentIndex, 
    answers, 
    onJumpToIndex 
}) {
    const t = useTranslations("Quiz");

    return (
        <div className="space-y-3" aria-label={t("questionNavigator")}>
            <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                    {questions.map((question, index) => {
                        const isAnswered = !!answers[question.id];
                        const isCurrent = index === currentIndex;
                        
                        return (
                            <Tooltip key={question.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isCurrent ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "w-10 h-10 p-0 font-medium transition-all",
                                            isAnswered && !isCurrent && "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800",
                                            isCurrent && "ring-2 ring-primary ring-offset-2"
                                        )}
                                        onClick={() => onJumpToIndex(index)}
                                        aria-label={t("questionStatus", { 
                                            number: index + 1, 
                                            status: isAnswered ? t("answered") : t("unanswered") 
                                        })}
                                        aria-current={isCurrent ? "step" : undefined}
                                    >
                                        {index + 1}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>
                                        {t("questionStatus", { 
                                            number: index + 1, 
                                            status: isAnswered ? t("answered") : t("unanswered") 
                                        })}
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </TooltipProvider>
            </div>
            
            <div className="flex gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span>{t("current")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-green-50 border border-green-200" />
                    <span>{t("answered")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border border-slate-200" />
                    <span>{t("unanswered")}</span>
                </div>
            </div>
        </div>
    );
}
