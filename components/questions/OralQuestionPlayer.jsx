"use client";

import { useState } from "react";
import { AudioRecorder } from "@/components/ui/AudioRecorder";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

export function OralQuestionPlayer({ question, onAnswerChange, initialAnswer }) {
  const t = useTranslations("Quiz");
  const [isUploading, setIsUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(initialAnswer?.audioUrl || null);
  const [skipped, setSkipped] = useState(initialAnswer?.skippedDueToMic || false);

  const handleRecordingComplete = async (blob, localUrl) => {
    setIsUploading(true);
    try {
      // 1. Get pre-signed URL
      const res = await fetch("/api/upload/audio-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `oral-answer-${question.id}.webm`,
          contentType: "audio/webm",
        }),
      });

      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileUrl } = await res.json();

      // 2. Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": "audio/webm" },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload to storage");

      // 3. Update state and notify parent
      setAudioUrl(fileUrl);
      setSkipped(false);
      onAnswerChange(question.id, {
        audioUrl: fileUrl,
        skippedDueToMic: false
      });
      
      toast.success(t("audioUploaded"));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setAudioUrl(null);
    onAnswerChange(question.id, null);
  };

  const handleSkipChange = (checked) => {
    setSkipped(checked);
    if (checked) {
      setAudioUrl(null);
      onAnswerChange(question.id, {
        audioUrl: null,
        skippedDueToMic: true
      });
    } else {
      onAnswerChange(question.id, null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <AudioRecorder 
          onRecordingComplete={handleRecordingComplete} 
          onClear={handleClear}
          initialAudioUrl={audioUrl}
        />
        
        {isUploading && (
          <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-blue-900">
                {t("uploadingAudio")}
              </p>
              <p className="text-xs text-blue-700">
                {t("pleaseWait") || "Please wait..."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 pt-4 border-t">
        <Checkbox 
          id={`skip-${question.id}`} 
          checked={skipped}
          onCheckedChange={handleSkipChange}
        />
        <Label 
          htmlFor={`skip-${question.id}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-600"
        >
          {t("skipOralQuestion")}
        </Label>
      </div>
    </div>
  );
}
