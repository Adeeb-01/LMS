"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitAdaptiveAnswer } from "@/app/actions/adaptive-quiz";
import { useTranslations } from "next-intl";
import { AbilityIndicator } from "./ability-indicator";
import { Send, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function AdaptiveQuizInterface({ quiz, courseId, initialData, deviceId }) {
  const t = useTranslations("Quiz");
  const router = useRouter();
  
  const [currentQuestion, setCurrentQuestion] = useState(initialData.currentQuestion);
  const [questionNumber, setQuestionNumber] = useState(initialData.questionNumber);
  const [currentTheta, setCurrentTheta] = useState(initialData.currentTheta);
  const [currentSE, setCurrentSE] = useState(initialData.currentSE);
  const [abilityLevel, setAbilityLevel] = useState(initialData.abilityLevel);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { correct, pointsEarned }
  const questionRef = useRef(null);

  const currentAnswer = answers[currentQuestion.id] || [];
  const isMultiple = currentQuestion.type === "multi";

  useEffect(() => {
    // Focus the new question when it changes for screen readers
    if (questionRef.current) {
      questionRef.current.focus();
    }
  }, [currentQuestion.id]);

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

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || currentAnswer.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await submitAdaptiveAnswer(
        initialData.attemptId,
        currentQuestion.id,
        currentAnswer,
        deviceId
      );

      if (result.success) {
        const data = result.data;
        setLastResult(data.answerResult);
        
        if (data.status === "terminated") {
          toast.success(t(`adaptive.terminationReasons.${data.terminationReason}`) || t("quizSubmitted"));
          router.push(`/courses/${courseId}/quizzes/${quiz.id}/result?attemptId=${initialData.attemptId}`);
        } else {
          // Continuing
          setCurrentQuestion(data.nextQuestion);
          setQuestionNumber(data.questionNumber);
          setCurrentTheta(data.newTheta);
          setCurrentSE(data.newSE);
          setAbilityLevel(data.abilityLevel);
          // Don't reset answers map, but current answer for next question will be empty
        }
      } else {
        toast.error(result.error?.message || t("failedToSubmit"));
      }
    } catch (error) {
      toast.error(error.message || t("failedToSubmit"));
    } finally {
      setIsSubmitting(false);
    }
  }, [initialData.attemptId, currentQuestion.id, currentAnswer, deviceId, courseId, quiz.id, router, t, isSubmitting]);

  const progressPercent = Math.min(100, (questionNumber / initialData.maxQuestions) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold">{quiz.title}</h1>
          <p className="text-sm text-slate-500">
            {t("questionOf", { current: questionNumber, total: initialData.maxQuestions })}
          </p>
        </div>
        
        <AbilityIndicator 
          theta={currentTheta} 
          percentile={Math.min(100, Math.max(0, (currentTheta + 3) / 6 * 100))} // Simple approximation for UI
          label={abilityLevel}
          className="w-full md:w-64"
        />
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Min: {initialData.minQuestions}</span>
          <span>Max: {initialData.maxQuestions}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Last Result Feedback (Optional, brief toast or subtle UI) */}
      {lastResult && (
        <div className={cn(
          "p-3 rounded-lg border flex items-center gap-3",
          lastResult.correct ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {lastResult.correct ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">
            {lastResult.correct ? t("correct") : t("incorrect")}
          </span>
        </div>
      )}

      {/* Question Card */}
      <div className="border rounded-xl p-8 bg-white shadow-sm transition-all">
        <div className="flex items-start justify-between mb-6">
          <h2 
            ref={questionRef} 
            tabIndex={-1} 
            className="text-xl font-semibold leading-tight outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            {currentQuestion.text}
          </h2>
          <Badge variant="outline" className="bg-slate-50">{currentQuestion.points || 1} pts</Badge>
        </div>

        <div className="space-y-3">
          {isMultiple && (
            <p className="text-sm text-slate-500 mb-2">{t("selectAllThatApply")}</p>
          )}
          
          {isMultiple ? (
            currentQuestion.options.map((option, idx) => (
              <div key={option.id} className="flex items-center gap-x-3 p-4 border rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer group">
                <Checkbox
                  id={`opt-${option.id}`}
                  checked={currentAnswer.includes(option.id)}
                  onCheckedChange={() => handleAnswerChange(currentQuestion.id, option.id, true)}
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
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, idx) => (
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

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || currentAnswer.length === 0}
          className="px-10 h-12 text-base font-semibold"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>{t("submitting")}...</span>
            </div>
          ) : (
            <>
              {t("next")}
              <ChevronRight className="w-5 h-5 ms-2 rtl:rotate-180" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
