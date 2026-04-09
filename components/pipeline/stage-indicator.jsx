import React from "react";
import { CheckCircle2, Circle, Loader2, XCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const StageIndicator = ({ stage, status, label, startedAt, completedAt, errorMessage }) => {
  const t = useTranslations("Pipeline");

  const statusConfig = {
    pending: {
      icon: Circle,
      className: "text-muted-foreground",
      label: t('status_pending') || "Pending"
    },
    processing: {
      icon: Loader2,
      className: "text-blue-500 animate-spin",
      label: t('status_processing') || "Processing"
    },
    completed: {
      icon: CheckCircle2,
      className: "text-green-500",
      label: t('status_completed') || "Completed"
    },
    failed: {
      icon: XCircle,
      className: "text-red-500",
      label: t('status_failed') || "Failed"
    },
    skipped: {
      icon: PlayCircle,
      className: "text-yellow-500",
      label: t('status_skipped') || "Skipped"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0 border-muted" role="status" aria-label={`${label}: ${config.label}`}>
      <div className={cn("mt-1", config.className)} aria-hidden="true">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium">{label}</h4>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-muted border border-muted-foreground/10", config.className)}>
            {config.label}
          </span>
        </div>
        {errorMessage && status === 'failed' && (
          <p className="text-xs text-red-500 mt-1 line-clamp-2">{errorMessage}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
          {startedAt && (
            <span>{t('started_at') || 'Started'}: {new Date(startedAt).toLocaleTimeString()}</span>
          )}
          {completedAt && (
            <span>{t('completed_at') || 'Completed'}: {new Date(completedAt).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StageIndicator;
