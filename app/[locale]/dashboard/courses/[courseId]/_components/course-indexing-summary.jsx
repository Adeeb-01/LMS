'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertCircle, Database } from 'lucide-react';

export default function CourseIndexingSummary({ courseId }) {
  const t = useTranslations('SemanticSearch');
  const tEdit = useTranslations('CourseEdit');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/semantic-search/status?courseId=${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch indexing summary:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchSummary();
    
    // Poll every 10 seconds if there are pending items
    let interval;
    if (summary?.pendingLessons > 0) {
      interval = setInterval(fetchSummary, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [summary?.pendingLessons, fetchSummary]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted/20 rounded-xl border border-dashed"></div>
        ))}
      </div>
    );
  }

  if (!summary || summary.totalLessons === 0) return null;

  const completionRate = summary.totalLessons > 0 
    ? Math.round((summary.indexedLessons / summary.totalLessons) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-medium">{t('indexingProgress')}</h3>
        </div>
        <div className="flex items-end justify-between mb-1">
          <span className="text-2xl font-bold">{completionRate}%</span>
          <span className="text-xs text-muted-foreground">{summary.indexedLessons}/{summary.totalLessons} {tEdit('moduleLessons') || 'Lessons'}</span>
        </div>
        <Progress value={completionRate} className="h-1.5" />
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-medium text-emerald-700">{t('indexed')}</h3>
        </div>
        <div className="text-2xl font-bold">{summary.indexedLessons}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('totalChunks', { count: summary.totalChunks })}
        </p>
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium text-amber-700">{t('pending')}</h3>
        </div>
        <div className="text-2xl font-bold">{summary.pendingLessons}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('indexingHint')}
        </p>
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-medium text-red-700">{t('failed')}</h3>
        </div>
        <div className="text-2xl font-bold">{summary.failedLessons}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {tEdit('somethingWentWrong') || 'Action required'}
        </p>
      </div>
    </div>
  );
}
