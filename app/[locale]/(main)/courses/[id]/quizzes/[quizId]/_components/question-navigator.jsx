"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRef, useEffect } from "react";

/**
 * QuestionNavigator Component
 * 
 * Provides a visual grid of question "pills" for jumping between questions.
 * Features:
 * - Visual status (current, answered, unanswered)
 * - Tooltips for detailed status
 * - Keyboard navigation (Arrow keys)
 * - ARIA labels for accessibility
 */
export function QuestionNavigator({ 
    questions, 
    currentIndex, 
    answers, 
    onJumpToIndex 
}) {
    const t = useTranslations("Quiz");
    const containerRef = useRef(null);

    // Handle arrow key navigation within the grid
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!containerRef.current) return;
            
            const buttons = Array.from(containerRef.current.querySelectorAll('button'));
            const activeIndex = buttons.indexOf(document.activeElement);
            
            if (activeIndex === -1) return;

            let nextIndex = -1;
            const isRTL = document.dir === 'rtl';

            if (e.key === 'ArrowRight') {
                nextIndex = isRTL ? (activeIndex - 1 + buttons.length) % buttons.length : (activeIndex + 1) % buttons.length;
            } else if (e.key === 'ArrowLeft') {
                nextIndex = isRTL ? (activeIndex + 1) % buttons.length : (activeIndex - 1 + buttons.length) % buttons.length;
            } else if (e.key === 'Home') {
                nextIndex = 0;
            } else if (e.key === 'End') {
                nextIndex = buttons.length - 1;
            }

            if (nextIndex !== -1) {
                e.preventDefault();
                buttons[nextIndex].focus();
            }
        };

        const container = containerRef.current;
        container?.addEventListener('keydown', handleKeyDown);
        return () => container?.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <nav 
            className="space-y-3" 
            aria-label={t("questionNavigator")}
            ref={containerRef}
        >
            <div className="flex flex-wrap gap-2" role="list">
                <TooltipProvider>
                    {questions.map((question, index) => {
                        const isAnswered = !!answers[question.id];
                        const isCurrent = index === currentIndex;
                        
                        return (
                            <div key={question.id} role="listitem">
                                <Tooltip>
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
                            </div>
                        );
                    })}
                </TooltipProvider>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs text-slate-500" aria-hidden="true">
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
        </nav>
    );
}
