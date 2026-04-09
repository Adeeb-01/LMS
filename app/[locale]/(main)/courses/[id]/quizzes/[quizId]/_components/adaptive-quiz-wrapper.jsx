"use client";

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { startAdaptiveAttempt } from "@/app/actions/adaptive-quiz";
import { startBatAttempt } from "@/app/actions/bat-quiz";
import { AdaptiveQuizInterface } from "./adaptive-quiz-interface";
import { BatQuizInterface } from "./bat-quiz-interface";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function AdaptiveQuizWrapper({ quiz, courseId }) {
  const t = useTranslations("Quiz");
  const router = useRouter();
  const [deviceId, setDeviceId] = useState(null);
  const [attemptData, setAttemptData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Get/Create deviceId from localStorage
    let storedDeviceId = localStorage.getItem("adaptive_device_id");
    if (!storedDeviceId) {
      storedDeviceId = uuidv4();
      localStorage.setItem("adaptive_device_id", storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // 2. Start/Resume attempt
    async function init() {
      try {
        const isBat = quiz.batConfig?.enabled;
        const result = isBat 
          ? await startBatAttempt(quiz.id, storedDeviceId)
          : await startAdaptiveAttempt(quiz.id, storedDeviceId);
          
        if (result.success) {
          setAttemptData(result.data);
        } else {
          toast.error(result.error?.message || t("failedToStartQuiz"));
          router.push(`/courses/${courseId}/quizzes`);
        }
      } catch (error) {
        toast.error(error.message || t("failedToStartQuiz"));
        router.push(`/courses/${courseId}/quizzes`);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [quiz.id, courseId, router, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-600">{t("isLoading")}</p>
        </div>
      </div>
    );
  }

  if (!attemptData) return null;

  if (quiz.batConfig?.enabled) {
    return (
      <BatQuizInterface
        quiz={quiz}
        courseId={courseId}
        initialData={attemptData}
        sessionId={deviceId}
      />
    );
  }

  return (
    <AdaptiveQuizInterface
      quiz={quiz}
      courseId={courseId}
      initialData={attemptData}
      deviceId={deviceId}
    />
  );
}
