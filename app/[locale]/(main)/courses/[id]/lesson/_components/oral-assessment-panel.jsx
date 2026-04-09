"use client";

import { useState, useEffect } from "react";
import { AudioRecorder } from "@/components/ui/AudioRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function OralAssessmentPanel({ assessment, lessonId, courseId, onComplete, onCancel }) {
    const t = useTranslations("OralAssessment");
    const [step, setStep] = useState("prompt"); // prompt, recording, evaluating, result
    const [audioBlob, setAudioBlob] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [attemptNumber, setAttemptNumber] = useState(1);
    const [inputMethod, setInputMethod] = useState("voice"); // voice, text
    const [textInput, setTextInput] = useState("");

    const handleRecordingComplete = (blob) => {
        setAudioBlob(blob);
    };

    const handleRecordingError = () => {
        setInputMethod("text");
        toast.error(t("micErrorFallback") || "Microphone error. Switching to text input.");
    };

    const handleSubmit = async () => {
        if (inputMethod === "voice" && !audioBlob) return;
        if (inputMethod === "text" && !textInput.trim()) return;

        setIsSubmitting(true);
        setStep("evaluating");

        try {
            let transcription = textInput;

            if (inputMethod === "voice") {
                // 1. Get presigned URL
                const fileName = `oral-assessment-${assessment.id}-${Date.now()}.webm`;
                const contentType = "audio/webm";
                
                const urlRes = await fetch("/api/upload/audio-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName, contentType })
                });

                if (!urlRes.ok) {
                    throw new Error("Failed to get upload URL");
                }

                const { url, key } = await urlRes.json();

                // 2. Upload to S3
                const uploadRes = await fetch(url, {
                    method: "PUT",
                    headers: { "Content-Type": contentType },
                    body: audioBlob
                });

                if (!uploadRes.ok) {
                    throw new Error("Failed to upload audio");
                }

                // 3. Submit for evaluation
                const audioUrl = url.split('?')[0]; // Public URL after upload
                
                const response = await fetch(`/api/oral-assessment/${assessment.id}/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        audioUrl,
                        lessonId,
                        courseId,
                        attemptNumber,
                        inputMethod: "voice"
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    setResult(data.result);
                    setStep("result");
                } else {
                    toast.error(data.error || "Failed to submit response");
                    setStep("prompt");
                }
            } else {
                // Text submission
                const response = await fetch(`/api/oral-assessment/${assessment.id}/submit`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        textResponse: textInput,
                        lessonId,
                        courseId,
                        attemptNumber,
                        inputMethod: "text"
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    setResult(data.result);
                    setStep("result");
                } else {
                    toast.error(data.error || "Failed to submit response");
                    setStep("prompt");
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An error occurred during submission");
            setStep("prompt");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        setAttemptNumber(prev => prev + 1);
        setAudioBlob(null);
        setResult(null);
        setStep("prompt");
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-xl border-primary/20 bg-background/95 backdrop-blur">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    <span className="bg-primary/10 p-2 rounded-full">🎙️</span>
                    {t("title") || "Oral Assessment"}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 py-4">
                {step === "prompt" && (
                    <div className="space-y-6">
                        <div className="bg-muted p-6 rounded-xl border border-border/50">
                            <p className="text-lg font-medium leading-relaxed text-foreground/90">
                                {assessment.questionText}
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                                <div className="flex bg-muted p-1 rounded-lg w-fit" role="radiogroup" aria-label={t("inputMethod") || "Input Method"}>
                                    <Button 
                                        variant={inputMethod === "voice" ? "secondary" : "ghost"} 
                                        size="sm" 
                                        className="h-8 text-xs px-4"
                                        onClick={() => setInputMethod("voice")}
                                        aria-checked={inputMethod === "voice"}
                                        role="radio"
                                    >
                                        🎤 {t("voice") || "Voice"}
                                    </Button>
                                    <Button 
                                        variant={inputMethod === "text" ? "secondary" : "ghost"} 
                                        size="sm" 
                                        className="h-8 text-xs px-4"
                                        onClick={() => setInputMethod("text")}
                                        aria-checked={inputMethod === "text"}
                                        role="radio"
                                    >
                                        ⌨️ {t("text") || "Text"}
                                    </Button>
                                </div>

                            {inputMethod === "voice" ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground mb-3">
                                        {t("recordYourAnswer") || "Record your answer below:"}
                                    </p>
                                    <AudioRecorder 
                                        onRecordingComplete={handleRecordingComplete}
                                        onClear={() => setAudioBlob(null)}
                                        onError={handleRecordingError}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground mb-3">
                                        {t("typeYourAnswer") || "Type your answer below:"}
                                    </p>
                                    <textarea 
                                        className="w-full min-h-[120px] bg-muted rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50"
                                        placeholder={t("answerPlaceholder") || "Type your answer here..."}
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === "evaluating" && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-lg font-medium animate-pulse">
                            {t("evaluatingResponse") || "Evaluating your response..."}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t("evaluatingSubtext") || "Comparing with lecture content using AI"}
                        </p>
                    </div>
                )}

                {step === "result" && result && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className={`p-6 rounded-xl border flex items-start gap-4 ${
                            result.passed 
                                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
                                : "bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400"
                        }`}>
                            {result.passed ? (
                                <CheckCircle2 className="h-8 w-8 shrink-0" />
                            ) : (
                                <AlertTriangle className="h-8 w-8 shrink-0" />
                            )}
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">
                                    {result.passed ? (t("passed") || "Assessment Passed") : (t("needsReview") || "Needs Review")}
                                </h3>
                                <p className="text-sm opacity-90 font-medium">
                                    {result.feedback}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                                <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                                    {t("similarityScore") || "Similarity Score"}
                                </p>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-black">
                                        {Math.round(result.similarityScore * 100)}%
                                    </span>
                                    <span className="text-xs text-muted-foreground mb-1">
                                        / 100%
                                    </span>
                                </div>
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                                <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                                    {t("conceptsCovered") || "Concepts Covered"}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.conceptsCovered.map((concept, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-500/20">
                                            {concept}
                                        </span>
                                    ))}
                                    {result.conceptsCovered.length === 0 && (
                                        <span className="text-sm text-muted-foreground italic">
                                            {t("noConceptsDetected") || "No key concepts detected"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {!result.passed && result.conceptsMissing.length > 0 && (
                            <div className="bg-orange-500/5 p-4 rounded-lg border border-orange-500/10">
                                <p className="text-xs uppercase tracking-wider font-bold text-orange-600 dark:text-orange-400 mb-2">
                                    {t("missingConcepts") || "Try to mention these:"}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.conceptsMissing.map((concept, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-full border border-orange-500/10">
                                            {concept}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
                {step === "prompt" && (
                    <>
                        <Button variant="ghost" onClick={onCancel}>
                            {t("skip") || "Skip Assessment"}
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting || (inputMethod === "voice" && !audioBlob) || (inputMethod === "text" && !textInput.trim())}
                            className="min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {t("submitAnswer") || "Submit Answer"}
                        </Button>
                    </>
                )}

                {step === "result" && (
                    <>
                        {!result.passed && attemptNumber < 3 ? (
                            <Button variant="outline" onClick={handleRetry}>
                                {t("tryAgain") || "Try Again"}
                            </Button>
                        ) : (
                            <div /> // Spacer
                        )}
                        <Button onClick={onComplete}>
                            {t("continueVideo") || "Continue Video"}
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}
