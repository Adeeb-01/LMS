"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Mic, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60; // Stop after 5 minutes

/**
 * Displays the grading status for an oral answer and polls the API
 * until the status transitions to "completed" or "failed".
 */
export function OralAnswerStatus({ oral, questionPoints, onGradingComplete }) {
    const t = useTranslations("Quiz");
    const [status, setStatus] = useState(oral?.gradingStatus || null);
    const [score, setScore] = useState(oral?.score || 0);
    const [transcribedText, setTranscribedText] = useState(oral?.transcribedText || "");
    const pollCountRef = useRef(0);
    const intervalRef = useRef(null);

    const shouldPoll = status === "pending" || status === "evaluating";

    const pollStatus = useCallback(async () => {
        if (!oral?.answerId) return;
        
        try {
            const res = await fetch(`/api/answers/${oral.answerId}/status`);
            if (!res.ok) return;

            const data = await res.json();
            if (!data.ok) return;

            setStatus(data.status);
            if (data.score != null) setScore(data.score);
            if (data.feedback) setTranscribedText(data.feedback);

            if (data.status === "completed" || data.status === "failed") {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                if (data.status === "completed" && onGradingComplete) {
                    onGradingComplete(data.score);
                }
            }
        } catch (err) {
            console.error("[ORAL_POLL_ERROR]", err);
        }

        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLLS && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [oral?.answerId, onGradingComplete]);

    useEffect(() => {
        if (shouldPoll && oral?.answerId) {
            intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            };
        }
    }, [shouldPoll, pollStatus, oral?.answerId]);

    // Skipped due to mic
    if (oral?.skippedDueToMic) {
        return (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t("skippedDueToMic")}</span>
            </div>
        );
    }

    // No audio submitted
    if (!oral?.audioUrl && !oral?.gradingStatus) {
        return (
            <div className="text-sm text-slate-500 italic">
                {t("noAnswerProvided")}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Audio playback */}
            {oral?.audioUrl && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border rounded-lg">
                    <Mic className="w-4 h-4 text-slate-500 shrink-0" />
                    <audio src={oral.audioUrl} controls className="h-8 flex-1" />
                </div>
            )}

            {/* Grading status */}
            {status === "pending" && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <span className="text-sm font-medium text-amber-800">
                        {t("gradingPending")}
                    </span>
                </div>
            )}

            {status === "evaluating" && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    <span className="text-sm font-medium text-blue-800">
                        {t("evaluatingAnswer")}
                    </span>
                </div>
            )}

            {status === "completed" && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge className={cn(
                            "text-xs",
                            score > 0 ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                        )}>
                            {score > 0 ? (
                                <CheckCircle2 className="w-3 h-3 me-1" />
                            ) : (
                                <XCircle className="w-3 h-3 me-1" />
                            )}
                            {t("oralScore", { score: score, total: questionPoints })}
                        </Badge>
                    </div>
                    {transcribedText && (
                        <div className="p-3 bg-slate-50 border rounded-lg">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                {t("transcription")}
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {transcribedText}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {status === "failed" && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-sm font-medium text-red-800">
                        {t("gradingFailed")}
                    </span>
                </div>
            )}
        </div>
    );
}
