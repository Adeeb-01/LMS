"use client";

import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  XCircle,
  Clock,
  RotateCcw,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerGeneration } from "@/app/actions/mcq-generation";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const GenerationProgress = ({ job }) => {
  const t = useTranslations("MCQGeneration");
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState([]);
  
  if (!job) return null;

  const { status, progress, chunkErrors = [], lessonId, quizId } = job;
  const { chunksProcessed, chunksTotal, questionsGenerated, percentComplete } = progress || {
    chunksProcessed: job.chunksProcessed || 0,
    chunksTotal: job.chunksTotal || 0,
    questionsGenerated: job.questionsGenerated || 0,
    percentComplete: job.chunksTotal > 0 ? Math.round(((job.chunksProcessed || 0) / job.chunksTotal) * 100) : 0
  };

  const visibleErrors = chunkErrors.filter(err => !dismissedErrors.includes(err.chunkId));
  
  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      const result = await triggerGeneration(lessonId, quizId);
      if (result.ok) {
        toast.success(t("retry_triggered"));
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to retry job");
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing': return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-gray-500" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed': return t("status_completed");
      case 'processing': return t("status_processing");
      case 'failed': return t("status_failed");
      case 'cancelled': return t("status_cancelled");
      default: return t("status_pending");
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-lg">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{getStatusText()}</h3>
            <p className="text-sm text-gray-500">
              {status === 'processing' 
                ? t("progress_summary", { processed: chunksProcessed, total: chunksTotal })
                : status === 'completed'
                  ? t("generation_complete", { count: questionsGenerated })
                  : status === 'failed'
                    ? t("generation_failed_desc")
                    : t("generation_idle")}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-2xl font-bold text-gray-900">{percentComplete}%</span>
          {status === 'failed' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 h-7 text-xs"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {t("retry_job")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Progress value={percentComplete} className="h-2" />
        <div className="flex justify-between text-xs text-gray-400 font-medium uppercase tracking-wider">
          <span>{chunksProcessed} {t("chunks_processed")}</span>
          <span>{chunksTotal} {t("chunks_total")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="text-xs text-green-600 font-semibold uppercase mb-1">{t("questions_generated")}</p>
          <p className="text-xl font-bold text-green-900">{questionsGenerated}</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg border",
          chunkErrors.length > 0 ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"
        )}>
          <p className={cn(
            "text-xs font-semibold uppercase mb-1",
            chunkErrors.length > 0 ? "text-red-600" : "text-gray-400"
          )}>{t("errors")}</p>
          <p className={cn(
            "text-xl font-bold",
            chunkErrors.length > 0 ? "text-red-900" : "text-gray-900"
          )}>{chunkErrors.length}</p>
        </div>
      </div>

      {visibleErrors.length > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">{t("recent_errors")}</span>
            </div>
            {visibleErrors.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] uppercase font-bold"
                onClick={() => setDismissedErrors(chunkErrors.map(e => e.chunkId))}
              >
                {t("dismiss_all")}
              </Button>
            )}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
            {visibleErrors.slice(-5).reverse().map((err, i) => (
              <div key={i} className="group relative flex items-start gap-3 text-xs p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
                <span className="font-mono font-bold shrink-0">[{err.chunkId}]</span>
                <span className="flex-1">{err.error}</span>
                <button 
                  onClick={() => setDismissedErrors(prev => [...prev, err.chunkId])}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition"
                  title={t("dismiss")}
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationProgress;
