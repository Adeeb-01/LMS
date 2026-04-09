import React from "react";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";

const ProgressSummary = ({ stages }) => {
  const t = useTranslations("Pipeline");

  const stageKeys = ['extraction', 'alignment', 'indexing', 'mcqGeneration', 'oralGeneration'];
  const completedCount = stageKeys.filter(key => stages[key]?.status === 'completed' || stages[key]?.status === 'skipped').length;
  const progressPercent = Math.round((completedCount / stageKeys.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{t('overall_progress') || 'Overall Progress'}</h3>
        <span className="text-sm font-medium text-muted-foreground">{progressPercent}%</span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
        {stageKeys.map(key => {
          const stageStatus = stages[key]?.status || 'pending';
          const isActive = stageStatus === 'processing';
          const isDone = stageStatus === 'completed' || stageStatus === 'skipped';
          const isFailed = stageStatus === 'failed';

          return (
            <div key={key} className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-muted/50 border border-muted-foreground/10">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{t(`stage_${key}`) || key}</span>
              <div className={`h-1.5 w-full rounded-full ${isDone ? 'bg-green-500' : isActive ? 'bg-blue-500 animate-pulse' : isFailed ? 'bg-red-500' : 'bg-muted'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressSummary;
