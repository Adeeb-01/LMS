"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Mic, Square, Trash2, Play, Pause, AlertCircle } from "lucide-react";
import { Progress } from "./progress";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function AudioRecorder({ onRecordingComplete, onClear, onError, initialAudioUrl }) {
  const t = useTranslations("Quiz");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || null);
  const [permissionError, setPermissionError] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        if (onRecordingComplete) {
          onRecordingComplete(blob, url);
        }
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPermissionError(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setPermissionError(true);
      
      // Determine error type for better user feedback
      let errorMsg = t("micPermissionDenied");
      let errorType = "permission";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorType = "permission";
        errorMsg = t("micPermissionDenied");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorType = "notfound";
        errorMsg = t("micNotFound") || "No microphone device found. Please connect a microphone.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorType = "inuse";
        errorMsg = t("micInUse") || "Microphone is already in use by another application.";
      } else {
        errorType = "unknown";
        errorMsg = t("micUnknownError") || "Unable to access microphone. Please check your device settings.";
      }
      
      setErrorDetails({ type: errorType, message: errorMsg });
      toast.error(errorMsg);
      if (onError) onError(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    }
  };

  const clearRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    if (onClear) onClear();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRetry = () => {
    setPermissionError(false);
    setErrorDetails(null);
  };

  if (permissionError) {
    return (
      <div className="space-y-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold">
              {errorDetails?.message || t("micPermissionError")}
            </p>
            <div className="text-xs text-destructive/80 space-y-1">
              <p className="font-medium">{t("troubleshootingSteps") || "Troubleshooting:"}:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>{t("checkBrowserPermissions") || "Check browser microphone permissions in settings"}</li>
                <li>{t("ensureMicConnected") || "Ensure microphone is connected and not in use"}</li>
                <li>{t("refreshPage") || "Try refreshing the page and allowing access"}</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            size="sm"
            className="border-destructive/30 hover:bg-destructive/20"
          >
            {t("retryMicrophone") || "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border rounded-lg p-4 sm:p-6 bg-slate-50/50">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
          <span className="text-sm sm:text-base font-mono font-medium text-slate-700">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!audioBlob ? (
            !isRecording ? (
              <Button 
                onClick={startRecording} 
                className="rounded-full h-14 w-14 sm:h-12 sm:w-12 p-0 touch-manipulation"
                variant="destructive"
                aria-label={t("startRecording") || "Start recording"}
              >
                <Mic className="h-6 w-6 sm:h-6 sm:w-6" />
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                className="rounded-full h-14 w-14 sm:h-12 sm:w-12 p-0 touch-manipulation"
                variant="outline"
                aria-label={t("stopRecording") || "Stop recording"}
              >
                <Square className="h-5 w-5 sm:h-5 sm:w-5 fill-current" />
              </Button>
            )
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <audio 
                src={audioUrl} 
                controls 
                className="h-10 sm:h-10 flex-1 sm:flex-none sm:max-w-none w-full sm:w-auto"
                controlsList="nodownload"
              />
              <Button 
                onClick={clearRecording} 
                variant="ghost" 
                size="icon"
                className="text-slate-500 hover:text-red-600 h-10 w-10 sm:h-9 sm:w-9 shrink-0 touch-manipulation"
                aria-label={t("clearRecording") || "Clear recording"}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isRecording && (
        <div className="space-y-1">
          <Progress value={(recordingTime % 60) * 1.66} className="h-1.5 sm:h-1" />
          <p className="text-[10px] sm:text-[10px] text-center text-slate-500 uppercase tracking-wider font-semibold">
            {t("recording") || "Recording..."}
          </p>
        </div>
      )}
    </div>
  );
}
