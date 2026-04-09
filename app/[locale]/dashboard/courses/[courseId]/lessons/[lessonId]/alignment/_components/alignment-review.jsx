"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Save,
  RefreshCw,
  Loader2
} from "lucide-react";

import { Button as ShdnButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/alignment/confidence-indicator";
import { adjustTimestamp, retryAlignment } from "@/app/actions/alignment";
import { cn } from "@/lib/utils";

export const AlignmentReview = ({ 
  courseId, 
  lessonId, 
  lesson, 
  document, 
  status, 
  alignments: initialAlignments 
}) => {
  const t = useTranslations("Alignment");
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [alignments, setAlignments] = useState(initialAlignments);
  const [activeBlockIndex, setActiveBlockIndex] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const videoRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  // Sync with current video time
  const handleTimeUpdate = useCallback((e) => {
    const time = e.target.currentTime;
    
    // Throttle updates to every 250ms
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 250) return;
    lastUpdateTimeRef.current = now;

    setCurrentTime(time);
    
    // Find active block based on current time
    const active = alignments.find(a => 
      a.status === 'aligned' && 
      a.startSeconds <= time && 
      time <= a.endSeconds
    );
    setActiveBlockIndex(active ? active.blockIndex : null);
  }, [alignments]);

  // Scroll active block into view
  useEffect(() => {
    if (activeBlockIndex !== null) {
      const element = document.getElementById(`block-${activeBlockIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeBlockIndex]);

  const handleSeek = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAdjust = async (blockIndex, start, end) => {
    setIsSaving(true);
    try {
      const result = await adjustTimestamp(lessonId, courseId, {
        blockIndex,
        startSeconds: start,
        endSeconds: end
      });

      if (result.success) {
        toast.success(t("timestampUpdated"));
        // Update local state
        setAlignments(prev => prev.map(a => 
          a.blockIndex === blockIndex 
            ? { ...a, startSeconds: start, endSeconds: end, manuallyVerified: true, status: 'aligned' }
            : a
        ));
      } else {
        toast.error(result.error || "Failed to update timestamp");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const result = await retryAlignment(lessonId, courseId);
      if (result.success) {
        toast.success(t("alignmentRetryQueued"));
        router.refresh();
      } else {
        toast.error(result.error || "Failed to retry alignment");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsRetrying(false);
    }
  };

  const videoUrl = lesson.videoProvider === 'local' ? lesson.videoUrl : lesson.video_url;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
      {/* Left Column: Video Player */}
      <div className="space-y-4 flex flex-col overflow-hidden">
        <Card className="flex-shrink-0 overflow-hidden bg-black aspect-video flex items-center justify-center relative shadow-sm rounded-lg border">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              controls
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="text-white flex flex-col items-center gap-2">
              <AlertCircle className="h-10 w-10 text-slate-500" />
              <p>{t("noVideoAvailable")}</p>
            </div>
          )}
        </Card>

        <Card className="flex-grow flex flex-col overflow-hidden shadow-sm border rounded-lg">
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{t("alignmentStatus")}</CardTitle>
                <CardDescription>
                  {t("verifyAndAdjust")}
                </CardDescription>
              </div>
              {status.jobStatus === 'failed' && (
                <ShdnButton 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
                  {t("retryAlignment")}
                </ShdnButton>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t("overallStatus")}
                </p>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    status.alignmentStatus === 'completed' ? "bg-green-500" : 
                    status.alignmentStatus === 'failed' ? "bg-red-500" : "bg-yellow-500"
                  )} />
                  <span className="font-semibold capitalize text-sm">{t(status.alignmentStatus)}</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t("confidenceIssues")}
                </p>
                <span className="font-semibold text-red-600 text-sm">
                  {t("blocksFlagged", { count: status.lowConfidenceBlocks || 0 })}
                </span>
              </div>
            </div>

            {status.errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
                <p className="font-semibold mb-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {t("lastError")}
                </p>
                {status.errorMessage}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Alignment Review List */}
      <Card className="flex flex-col overflow-hidden h-full shadow-sm border rounded-lg">
        <CardHeader className="border-b bg-slate-50/50 py-3 px-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">{t("alignmentSegments")}</CardTitle>
          </div>
          <CardDescription className="text-xs">
            {t("verifyAndAdjust")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {document.extractedText.structuredContent.map((block, index) => {
              const alignment = alignments.find(a => a.blockIndex === index);
              const isActive = activeBlockIndex === index;
              
              return (
                <div 
                  key={index} 
                  id={`block-${index}`}
                  className={cn(
                    "p-4 transition-colors",
                    isActive ? "bg-blue-50/50" : "hover:bg-slate-50",
                    alignment?.confidence < 70 && alignment?.status === 'aligned' && !alignment.manuallyVerified && "bg-red-50/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-grow">
                      <p className="text-sm font-medium text-slate-900 leading-relaxed mb-2">
                        {block.content}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <ConfidenceIndicator 
                          confidence={alignment?.confidence || 0} 
                          status={alignment?.status || 'unable-to-align'} 
                        />
                        {alignment?.manuallyVerified && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] h-5">
                            {t("manuallyVerified")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 bg-white p-2 rounded-md border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 flex-grow">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-slate-400 font-bold ml-1">{t("start")}</label>
                        <Input 
                          type="number" 
                          step="0.1"
                          className="h-8 text-xs focus-visible:ring-blue-500"
                          value={alignment?.startSeconds || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            setAlignments(prev => prev.map(a => 
                              a.blockIndex === index ? { ...a, startSeconds: val } : a
                            ));
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase text-slate-400 font-bold ml-1">{t("end")}</label>
                        <Input 
                          type="number" 
                          step="0.1"
                          className="h-8 text-xs focus-visible:ring-blue-500"
                          value={alignment?.endSeconds || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            setAlignments(prev => prev.map(a => 
                              a.blockIndex === index ? { ...a, endSeconds: val } : a
                            ));
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-1 self-end pb-0.5">
                      <ShdnButton 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title={t("alignmentStatus")}
                        onClick={() => {
                          setAlignments(prev => prev.map(a => 
                            a.blockIndex === index ? { ...a, startSeconds: Math.round(currentTime * 10) / 10 } : a
                          ));
                        }}
                      >
                        <Clock className="h-4 w-4" />
                      </ShdnButton>
                      <ShdnButton 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title={t("saveChanges")}
                        disabled={isSaving}
                        onClick={() => handleAdjust(index, alignment.startSeconds, alignment.endSeconds)}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </ShdnButton>
                      <ShdnButton 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                        title={t("seekToThisPoint")}
                        disabled={alignment?.startSeconds === null}
                        onClick={() => handleSeek(alignment.startSeconds)}
                      >
                        <Play className="h-3 w-3 fill-current" />
                      </ShdnButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
