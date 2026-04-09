import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, FileUp } from "lucide-react";
import { useTranslations } from 'next-intl';

/**
 * Component to show the processing status of a lecture document extraction
 * @param {string} status - 'uploading', 'processing', 'ready', 'failed'
 * @param {string} errorMessage - optional error message if status is 'failed'
 */
export const ExtractionStatus = ({ status, errorMessage }) => {
  const t = useTranslations('ExtractionStatus');

  const statusConfig = {
    uploading: {
      color: "bg-blue-500",
      icon: <FileUp className="h-4 w-4 animate-bounce" />,
      label: t('uploading'),
      progress: 25
    },
    processing: {
      color: "bg-yellow-500",
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      label: t('processing'),
      progress: 60
    },
    ready: {
      color: "bg-green-500",
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: t('ready'),
      progress: 100
    },
    failed: {
      color: "bg-red-500",
      icon: <AlertCircle className="h-4 w-4" />,
      label: t('failed'),
      progress: 0
    }
  };

  const config = statusConfig[status] || statusConfig.failed;

  if (status === 'failed') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {errorMessage || t('genericError')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <Badge variant={status === 'ready' ? "default" : "secondary"}>
          {status === 'ready' ? t('completed') : `${config.progress}%`}
        </Badge>
      </div>
      <Progress value={config.progress} className={`h-2 ${config.color}`} />
    </div>
  );
};
