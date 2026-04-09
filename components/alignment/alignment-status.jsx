"use client";

import React, { useEffect, useState } from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RotateCcw,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { getAlignmentStatus, triggerAlignment } from "@/app/actions/alignment";
import { useTranslations } from 'next-intl';

/**
 * Component to display and trigger alignment status.
 */
export const AlignmentStatus = ({ lessonId, courseId }) => {
  const t = useTranslations("Alignment");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await getAlignmentStatus(lessonId, courseId);
      if (res.success) {
        setStatus(res);
      }
    } catch (err) {
      console.error("Failed to fetch alignment status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll if processing
    let interval;
    if (status?.jobStatus === 'processing' || status?.jobStatus === 'queued') {
      interval = setInterval(fetchStatus, 3000);
    }
    
    return () => clearInterval(interval);
  }, [lessonId, courseId, status?.jobStatus]);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await triggerAlignment(lessonId, courseId);
      if (res.success) {
        toast.success(res.message);
        fetchStatus();
      } else {
        toast.error(res.error || res.message);
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> {t("processing")}</div>;
  }

  const isProcessing = status?.jobStatus === 'processing' || status?.jobStatus === 'queued';
  const isFailed = status?.jobStatus === 'failed' || status?.alignmentStatus === 'failed';
  const isCompleted = status?.hasAlignment;

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant={isCompleted ? "success" : isFailed ? "destructive" : "secondary"}>
            {isProcessing ? (
              <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {t("processing")}</span>
            ) : isCompleted ? (
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t("ready")}</span>
            ) : isFailed ? (
              <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {t("failed")}</span>
            ) : (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Not Aligned</span>
            )}
          </Badge>
          <span className="text-sm font-medium">{t("alignmentStatus")}</span>
        </div>
        
        {!isProcessing && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTrigger} 
            disabled={triggering}
          >
            {isCompleted ? <RotateCcw className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isCompleted ? "Re-sync" : isFailed ? "Retry" : "Start Sync"}
          </Button>
        )}
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>{status.phase === 'transcription' ? t("processing") : t("aligning")}</span>
            <span>{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>
      )}

      {isFailed && status.errorMessage && (
        <p className="mt-2 text-xs text-destructive">{status.errorMessage}</p>
      )}

      {!isProcessing && !isCompleted && !isFailed && (
        <p className="text-xs text-muted-foreground">
          {t("verifyAndAdjust")}
        </p>
      )}
    </div>
  );
};
