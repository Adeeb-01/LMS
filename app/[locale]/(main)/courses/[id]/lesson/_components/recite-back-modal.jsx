"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AudioRecorder } from "@/components/ui/AudioRecorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { submitReciteBack } from "@/app/actions/rag-tutor";

export function ReciteBackModal({ interaction, lessonId, onComplete, onCancel }) {
    const t = useTranslations("ReciteBack");
    const [step, setStep] = useState("prompt"); // prompt, evaluating, result
    const modalRef = useRef(null);
    const previousActiveElement = useRef(null);

    // Focus trap and keyboard handling
    useEffect(() => {
        previousActiveElement.current = document.activeElement;
        
        // Focus the modal on mount
        if (modalRef.current) {
            modalRef.current.focus();
        }

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCancel();
            }
            
            // Trap focus within modal
            if (e.key === 'Tab') {
                const focusableElements = modalRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusableElements || focusableElements.length === 0) return;
                
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            // Restore focus on unmount
            if (previousActiveElement.current) {
                previousActiveElement.current.focus();
            }
        };
    }, [onCancel]);
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
            let recitation = textInput;

            if (inputMethod === "voice") {
                // 1. Get presigned URL
                const fileName = `recite-back-${interaction.interactionId}-${Date.now()}.webm`;
                const contentType = "audio/webm";
                
                const urlRes = await fetch("/api/upload/audio-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName, contentType })
                });

                if (!urlRes.ok) throw new Error("Failed to get upload URL");
                const { url } = await urlRes.json();

                // 2. Upload to S3
                const uploadRes = await fetch(url, {
                    method: "PUT",
                    headers: { "Content-Type": contentType },
                    body: audioBlob
                });

                if (!uploadRes.ok) throw new Error("Failed to upload audio");

                // 3. Transcription is handled by the server action via the audioUrl
                // For US3, we'll assume the server action handles the transcription if we pass the audioUrl
                // Actually, looking at US1, the API route handles it. Let's stick to the server action pattern.
                // We'll pass the audioUrl to the server action.
                const audioUrl = url.split('?')[0];
                
                // We need to update the server action to handle audioUrl or use a separate API route.
                // Given the existing pattern in US1, let's use the API route for US3 as well.
                // But wait, US2 used a server action for askTutor. 
                // Let's assume the server action can handle transcription if we provide the audioUrl.
                
                const response = await fetch("/api/rag-tutor/recite-back", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        audioUrl,
                        interactionId: interaction.interactionId,
                        lessonId,
                        attemptNumber,
                        inputMethod: "voice"
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    setResult(data.result);
                    setStep("result");
                } else {
                    throw new Error(data.error || "Failed to evaluate recitation");
                }
            } else {
                // Text submission
                const res = await submitReciteBack({
                    interactionId: interaction.interactionId,
                    lessonId,
                    recitation,
                    inputMethod: "text",
                    attemptNumber
                });

                if (res.ok) {
                    setResult(res.result);
                    setStep("result");
                } else {
                    throw new Error(res.error || "Failed to evaluate recitation");
                }
            }
        } catch (error) {
            console.error("Recite-back error:", error);
            toast.error(error.message || "An error occurred during evaluation");
            setStep("prompt");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        setAttemptNumber(prev => prev + 1);
        setAudioBlob(null);
        setTextInput("");
        setResult(null);
        setStep("prompt");
    };

    const titleId = "recite-back-title";

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={modalRef}
            tabIndex={-1}
        >
            <Card className="w-full max-w-2xl shadow-2xl border-primary/20 bg-background/95">
                <CardHeader className="pb-2">
                    <CardTitle id={titleId} className="text-xl flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
                        {t("title") || "Recite Back"}
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-6 py-4">
                    {step === "prompt" && (
                        <div className="space-y-6">
                            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                <p className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">
                                    {t("explainInYourWords") || "Explain this concept in your own words:"}
                                </p>
                                <p className="text-md italic text-foreground/80 leading-relaxed">
                                    "{interaction.response}"
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
                                        <p className="text-sm text-muted-foreground">
                                            {t("recordRecitation") || "Record your recitation:"}
                                        </p>
                                        <AudioRecorder 
                                            onRecordingComplete={handleRecordingComplete}
                                            onClear={() => setAudioBlob(null)}
                                            onError={handleRecordingError}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            {t("typeRecitation") || "Type your recitation:"}
                                        </p>
                                        <textarea 
                                            className="w-full min-h-[120px] bg-muted rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50"
                                            placeholder={t("recitationPlaceholder") || "Explain it here..."}
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
                                {t("evaluatingRecitation") || "Evaluating your recitation..."}
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
                                        {result.passed ? (t("greatRecall") || "Great Recall!") : (t("keepTrying") || "Not Quite")}
                                    </h3>
                                    <p className="text-sm opacity-90 font-medium">
                                        {result.feedback}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/50 p-6 rounded-xl border border-border/50 flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">
                                        {t("recallAccuracy") || "Recall Accuracy"}
                                    </p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-4xl font-black">
                                            {Math.round(result.similarityScore * 100)}%
                                        </span>
                                        <span className="text-sm text-muted-foreground mb-1">
                                            / 100%
                                        </span>
                                    </div>
                                </div>
                                {!result.passed && (
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
                                            {t("attempts") || "Attempts"}
                                        </p>
                                        <p className="text-xl font-black">
                                            {attemptNumber} / 3
                                        </p>
                                    </div>
                                )}
                            </div>

                            {!result.passed && attemptNumber >= 3 && (
                                <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                                    <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                                        {t("conceptLogged") || "We've flagged this concept for your session summary so you can review it later."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                    {step === "prompt" && (
                        <>
                            <Button variant="ghost" onClick={onCancel}>
                                {t("skip") || "Skip"}
                            </Button>
                            <Button 
                                onClick={handleSubmit} 
                                disabled={isSubmitting || (inputMethod === "voice" && !audioBlob) || (inputMethod === "text" && !textInput.trim())}
                                className="min-w-[140px]"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {t("submitRecitation") || "Submit Recitation"}
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
                                <div />
                            )}
                            <Button onClick={onComplete}>
                                {t("continue") || "Continue"}
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
