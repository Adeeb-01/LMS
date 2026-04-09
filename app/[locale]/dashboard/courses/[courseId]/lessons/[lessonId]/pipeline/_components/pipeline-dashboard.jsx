"use client"

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle, CheckCircle2, RefreshCcw, ArrowLeft } from "lucide-react";
import StageIndicator from "@/components/pipeline/stage-indicator";
import ProgressSummary from "@/components/pipeline/progress-summary";
import RetryButton from "@/components/pipeline/retry-button";
import { getPipelineStatus, triggerPipeline } from "@/app/actions/pipeline";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PipelineDashboard = ({ courseId, lessonId, locale }) => {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const t = useTranslations("Pipeline");
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getPipelineStatus(lessonId);
      if (result.success) {
        setPipeline(result.pipeline);
        setError(null);
        // Continue polling if processing
        const status = result.pipeline.status;
        const inProgress = ['pending', 'extracting', 'aligning', 'indexing', 'generating'].includes(status);
        setIsPolling(inProgress);
      } else {
        // If not found, it might just not be started yet
        if (result.error === "Pipeline job not found") {
          setPipeline(null);
        } else {
          setError(result.error);
        }
        setIsPolling(false);
      }
    } catch (err) {
      console.error("Fetch Status Error:", err);
      setError(err.message);
      setIsPolling(false);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    let interval;
    if (isPolling) {
      interval = setInterval(() => {
        fetchStatus();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, fetchStatus]);

  const handleStartPipeline = async () => {
    setIsTriggering(true);
    try {
      const result = await triggerPipeline(lessonId);
      if (result.success) {
        toast({
          title: t('pipeline_started') || 'Pipeline Started',
          description: t('pipeline_started_desc') || 'Your content is being processed.',
        });
        fetchStatus();
      } else {
        toast({
          title: t('pipeline_error') || 'Pipeline Error',
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: t('pipeline_error') || 'Pipeline Error',
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsTriggering(false);
    }
  };

  if (loading && !pipeline) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <RefreshCcw className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">{t('loading_status') || 'Checking processing status...'}</p>
      </div>
    );
  }

  const stages = pipeline?.stages || {
    extraction: { status: 'pending' },
    alignment: { status: 'pending' },
    indexing: { status: 'pending' },
    mcqGeneration: { status: 'pending' },
    oralGeneration: { status: 'pending' }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/dashboard/courses/${courseId}/lessons/${lessonId}`}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('pipeline_dashboard') || 'Content Processing Dashboard'}</h1>
          <p className="text-sm text-muted-foreground">{t('pipeline_dashboard_desc') || 'Monitor automated extraction, alignment, indexing, and question generation.'}</p>
        </div>
      </div>

      {!pipeline && !error && (
        <Alert className="bg-blue-500/5 border-blue-500/20">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">{t('pipeline_not_started') || 'No Active Pipeline'}</AlertTitle>
          <AlertDescription>
            {t('pipeline_not_started_desc') || 'Automated processing has not been triggered for this lesson yet.'}
            <div className="mt-4">
              <Button onClick={handleStartPipeline} disabled={isTriggering} size="sm">
                {isTriggering && <RefreshCcw className="h-3.5 w-3.5 mr-2 animate-spin" />}
                {t('trigger_pipeline') || 'Trigger Full Pipeline'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error') || 'Error'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {pipeline && (
        <>
          <Card className="border-muted shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-full", 
                    pipeline.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                    pipeline.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                    pipeline.status === 'cancelled' ? 'bg-gray-500/10 text-gray-500' :
                    'bg-blue-500/10 text-blue-500 animate-pulse'
                  )} aria-hidden="true">
                    {pipeline.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : 
                     pipeline.status === 'failed' ? <AlertCircle className="h-5 w-5" /> : 
                     <RefreshCcw className="h-5 w-5 animate-spin" />}
                  </div>
                  <div aria-live="polite">
                    <CardTitle className="text-lg">
                      {pipeline.status === 'completed' ? t('pipeline_completed') || 'Processing Complete' : 
                       pipeline.status === 'failed' ? t('pipeline_failed') || 'Processing Failed' : 
                       t('pipeline_in_progress') || 'Processing in Progress'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('started_at') || 'Started'}: {new Date(pipeline.createdAt).toLocaleString()}
                      {pipeline.completedAt && ` • ${t('completed_at') || 'Completed'}: ${new Date(pipeline.completedAt).toLocaleTimeString()}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(pipeline.status === 'failed' || pipeline.status === 'completed' || pipeline.status === 'cancelled') && (
                    <Button variant="outline" size="sm" onClick={handleStartPipeline} disabled={isTriggering}>
                      {isTriggering ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                      <span className="ml-2">{t('restart_pipeline') || 'Restart Full Pipeline'}</span>
                    </Button>
                  )}
                  {isPolling && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                      <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                      {t('polling') || 'Real-time Updating'}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ProgressSummary stages={stages} />
            </CardContent>
          </Card>

          <Card className="border-muted shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-base">{t('pipeline_stages') || 'Detailed Processing Stages'}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-muted p-0 px-6">
              <StageIndicator 
                label={t('stage_extraction') || 'Text Extraction'} 
                status={stages.extraction.status}
                startedAt={stages.extraction.startedAt}
                completedAt={stages.extraction.completedAt}
                errorMessage={stages.extraction.errorMessage}
              />
              <StageIndicator 
                label={t('stage_alignment') || 'Video Alignment'} 
                status={stages.alignment.status}
                startedAt={stages.alignment.startedAt}
                completedAt={stages.alignment.completedAt}
                errorMessage={stages.alignment.errorMessage}
              />
              <StageIndicator 
                label={t('stage_indexing') || 'Semantic Indexing'} 
                status={stages.indexing.status}
                startedAt={stages.indexing.startedAt}
                completedAt={stages.indexing.completedAt}
                errorMessage={stages.indexing.errorMessage}
              />
              <div className="flex items-center justify-between gap-4 py-3 border-b border-muted">
                <div className="flex-1">
                  <StageIndicator 
                    label={t('stage_mcqGeneration') || 'MCQ Generation'} 
                    status={stages.mcqGeneration.status}
                    startedAt={stages.mcqGeneration.startedAt}
                    completedAt={stages.mcqGeneration.completedAt}
                    errorMessage={stages.mcqGeneration.errorMessage}
                  />
                </div>
                {stages.mcqGeneration.status === 'failed' && (
                  <RetryButton 
                    pipelineJobId={pipeline._id} 
                    stage="mcqGeneration" 
                    onRetry={fetchStatus} 
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div className="flex-1">
                  <StageIndicator 
                    label={t('stage_oralGeneration') || 'Oral Generation'} 
                    status={stages.oralGeneration.status}
                    startedAt={stages.oralGeneration.startedAt}
                    completedAt={stages.oralGeneration.completedAt}
                    errorMessage={stages.oralGeneration.errorMessage}
                  />
                </div>
                {stages.oralGeneration.status === 'failed' && (
                  <RetryButton 
                    pipelineJobId={pipeline._id} 
                    stage="oralGeneration" 
                    onRetry={fetchStatus} 
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {pipeline.status === 'completed' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Alert className="bg-green-500/5 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">{t('pipeline_summary') || 'Processing Summary'}</AlertTitle>
                <AlertDescription className="text-xs space-y-1 mt-2">
                  <p>{t('total_mcqs') || 'Total MCQs Generated'}: <span className="font-semibold">{stages.mcqGeneration.questionsGenerated || 0}</span></p>
                  <p>{t('total_oral') || 'Total Oral Questions'}: <span className="font-semibold">{stages.oralGeneration.questionsGenerated || 0}</span></p>
                  <p>{t('chunks_indexed') || 'Total Chunks Indexed'}: <span className="font-semibold">{stages.indexing.chunksIndexed || 0}</span></p>
                </AlertDescription>
              </Alert>
              <div className="flex items-end justify-end gap-3">
                <Link href={`/${locale}/dashboard/courses/${courseId}/quizzes/${lessonId}`}>
                  <Button className="w-full md:w-auto">{t('view_questions') || 'Review Generated Questions'}</Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PipelineDashboard;
