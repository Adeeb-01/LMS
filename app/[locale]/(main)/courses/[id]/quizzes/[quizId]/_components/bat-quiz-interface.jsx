"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitBatBlock } from "@/app/actions/bat-quiz";
import { useTranslations } from "next-intl";
import { AbilityIndicator } from "./ability-indicator";
import { BlockProgressIndicator } from "./block-progress-indicator";
import { Send, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function BatQuizInterface({ quiz, courseId, initialData, sessionId }) {
  const t = useTranslations("Quiz");
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef(null);
  
  const [currentBlock, setCurrentBlock] = useState(initialData.currentBlock);
  const [blockNumber, setBlockNumber] = useState(initialData.blockNumber);
  const [theta, setTheta] = useState(initialData.theta);
  const [abilityLevel, setAbilityLevel] = useState(initialData.abilityLevel);
  const [answers, setAnswers] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`bat_answers_${initialData.attemptId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only return if it matches current block questions
          const questionIds = currentBlock.questions.map(q => q.id);
          const savedIds = Object.keys(parsed);
          if (savedIds.every(id => questionIds.includes(id))) {
            return parsed;
          }
        } catch (e) {
          console.error("Failed to parse saved answers", e);
        }
      }
    }
    return {};
  }); // { questionId: [optionIds] }

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`bat_answers_${initialData.attemptId}`, JSON.stringify(answers));
    }
  }, [answers, initialData.attemptId]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (Object.keys(answers).length > 0 && !isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [answers, isSubmitting]);

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
        return { ...prev, [questionId]: [value] };
      }
    });
  }, []);

  const allAnswered = currentBlock.questions.every(
    q => answers[q.id]?.length > 0
  );

  const handleSubmitBlock = useCallback(async () => {
    if (!allAnswered || isSubmitting) return;
    setIsSubmitting(true);

    const blockAnswers = currentBlock.questions.map(q => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id]
    }));

    try {
      const result = await submitBatBlock(initialData.attemptId, blockAnswers, sessionId);
      
      if (result.success) {
        localStorage.removeItem(`bat_answers_${initialData.attemptId}`);
        const data = result.data;
        if (data.status === 'completed') {
          toast.success(t("quizSubmitted"));
          router.push(`/courses/${courseId}/quizzes/${quiz.id}/result?attemptId=${initialData.attemptId}`);
        } else {
          setCurrentBlock(data.nextBlock);
          setBlockNumber(data.blockNumber);
          setTheta(data.newTheta);
          setAbilityLevel(data.abilityLevel);
          setAnswers({});
          toast.success(t("blockSubmitted"));
        }
      } else {
        toast.error(result.error?.message || t("failedToSubmit"));
      }
    } catch (error) {
      toast.error(error.message || t("failedToSubmit"));
    } finally {
      setIsSubmitting(false);
    }
  }, [allAnswered, answers, currentBlock, initialData.attemptId, sessionId, courseId, quiz.id, router, t, isSubmitting]);

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <div className="mt-2">
            <BlockProgressIndicator 
              current={blockNumber} 
              total={initialData.totalBlocks} 
            />
          </div>
        </div>
        
        <AbilityIndicator 
          theta={theta} 
          percentile={Math.min(100, Math.max(0, (theta + 3) / 6 * 100))}
          label={abilityLevel}
          className="w-full md:w-64"
        />
      </div>

      {/* Questions in Block */}
      <div className="space-y-8">
        {currentBlock.questions.map((question, idx) => {
          const isMultiple = question.type === "multi";
          const currentAnswer = answers[question.id] || [];
          
          return (
            <div key={question.id} className="border rounded-xl p-8 bg-white shadow-sm transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex gap-4">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {idx + 1}
                  </span>
                  <h2 className="text-xl font-semibold leading-tight text-slate-800">
                    {question.text}
                  </h2>
                </div>
                <Badge variant="outline" className="bg-slate-50">{question.points || 1} pts</Badge>
              </div>

              <div className="space-y-3 ml-12">
                {isMultiple && (
                  <p className="text-sm text-slate-500 mb-2">{t("selectAllThatApply")}</p>
                )}
                
                {isMultiple ? (
                  question.options.map((option) => (
                    <div key={option.id} className="flex items-center gap-x-3 p-4 border rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer group">
                      <Checkbox
                        id={`opt-${option.id}`}
                        checked={currentAnswer.includes(option.id)}
                        onCheckedChange={() => handleAnswerChange(question.id, option.id, true)}
                        className="w-5 h-5"
                      />
                      <Label htmlFor={`opt-${option.id}`} className="flex-1 cursor-pointer font-normal text-slate-700 group-hover:text-slate-900">
                        {option.text}
                      </Label>
                    </div>
                  ))
                ) : (
                  <RadioGroup
                    value={currentAnswer[0] || ""}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    className="space-y-3"
                  >
                    {question.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-x-3 p-4 border rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer group">
                        <RadioGroupItem value={option.id} id={`opt-${option.id}`} className="w-5 h-5" />
                        <Label htmlFor={`opt-${option.id}`} className="flex-1 cursor-pointer font-normal text-slate-700 group-hover:text-slate-900">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={handleSubmitBlock}
          disabled={isSubmitting || !allAnswered}
          className="px-10 h-12 text-base font-semibold relative overflow-hidden"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>{t("bat.loadingNextBlock")}</span>
            </div>
          ) : (
            <>
              {blockNumber === initialData.totalBlocks ? t("submitQuiz") : t("nextBlock")}
              <ChevronRight className="w-5 h-5 ms-2 rtl:rotate-180" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
