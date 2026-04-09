'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database } from 'lucide-react';
import { triggerIndexing } from '@/app/actions/indexing';
import { toast } from 'sonner';

export default function EmbeddingStatus({ courseId, lessonId }) {
  const t = useTranslations('SemanticSearch');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/semantic-search/status?courseId=${courseId}&lessonId=${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch embedding status:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    fetchStatus();

    // Poll if status is pending or processing
    let interval;
    if (status?.status === 'pending' || status?.status === 'processing') {
      interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.status, fetchStatus]);

  const handleRetry = async () => {
    if (!status?.lectureDocumentId) return;
    setIsRetrying(true);
    try {
      const res = await triggerIndexing(status.lectureDocumentId);
      if (res?.success) {
        toast.success(t('indexingStatus') + ': ' + t('pending'));
        fetchStatus();
      } else {
        toast.error(res?.error || t('failed'));
      }
    } catch (error) {
      toast.error(t('failed'));
    } finally {
      setIsRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse bg-muted/20 p-2 rounded-md border border-dashed">
        <div className="h-4 w-4 bg-muted rounded-full"></div>
        <div className="h-4 w-24 bg-muted rounded"></div>
      </div>
    );
  }

  if (status?.status === 'none') return null;

  const getStatusDisplay = () => {
    switch (status?.status) {
      case 'indexed':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          label: t('indexed'),
          className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 cursor-default',
          description: t('totalChunks', { count: status.chunksIndexed })
        };
      case 'processing':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />,
          label: t('processing'),
          className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 cursor-default',
          description: t('indexingHint')
        };
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4 text-amber-500" />,
          label: t('pending'),
          className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50 cursor-default',
          description: t('indexingHint')
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          label: t('failed'),
          className: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50 cursor-default',
          description: t('failed')
        };
      default:
        return null;
    }
  };

  const display = getStatusDisplay();
  if (!display) return null;

  return (
    <div className="flex flex-col space-y-2 p-3 border rounded-lg bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-hidden">
          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{t('indexingStatus')}</span>
        </div>
        <Badge variant="outline" className={`${display.className} shrink-0`}>
          <div className="flex items-center space-x-1">
            {display.icon}
            <span>{display.label}</span>
          </div>
        </Badge>
      </div>
      
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {display.description}
        </p>
        {status?.status === 'failed' && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
            onClick={handleRetry}
            disabled={isRetrying}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            {t('retry')}
          </Button>
        )}
      </div>
    </div>
  );
}
