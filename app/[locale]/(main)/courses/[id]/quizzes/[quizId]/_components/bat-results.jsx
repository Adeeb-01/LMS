"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Target, 
  AlertCircle,
  BookOpen
} from "lucide-react";
import { AbilityIndicator } from "./ability-indicator";
import { cn } from "@/lib/utils";

export function BatResults({ attemptData, quiz }) {
  const t = useTranslations("Quiz");

  if (!attemptData || !quiz) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="md:col-span-2 h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const { summary, finalTheta, abilityLevel, missedConceptTags, blocks, thetaProgression } = attemptData;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Hero Section: Final Result */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-primary/20 text-primary mb-2">
                  {t("quizResult")}
                </Badge>
                <h1 className="text-3xl font-bold text-slate-900">{quiz.title}</h1>
                <p className="text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t("completedOn")}: {new Date(attemptData.completedAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center min-w-[180px]">
                <div className={cn(
                  "text-4xl font-black mb-1",
                  summary.passed ? "text-green-600" : "text-red-600"
                )}>
                  {summary.scorePercent}%
                </div>
                <Badge variant={summary.passed ? "success" : "destructive"} className="uppercase tracking-wider">
                  {summary.passed ? t("passed") : t("failed")}
                </Badge>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-white/60">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">{t("totalQuestions")}</p>
                <p className="text-xl font-bold text-slate-800">{summary.totalQuestions}</p>
              </div>
              <div className="bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-white/60">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">{t("correct")}</p>
                <p className="text-xl font-bold text-green-600">{summary.correctCount}</p>
              </div>
              <div className="bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-white/60">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">{t("incorrect")}</p>
                <p className="text-xl font-bold text-red-500">{summary.totalQuestions - summary.correctCount}</p>
              </div>
              <div className="bg-white/40 backdrop-blur-sm p-4 rounded-xl border border-white/60">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-tight mb-1">{t("points")}</p>
                <p className="text-xl font-bold text-slate-800">{summary.correctCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t("abilityEstimate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center text-center">
            <AbilityIndicator 
              theta={finalTheta} 
              label={abilityLevel}
              percentile={Math.min(100, Math.max(0, (finalTheta + 3) / 6 * 100))}
              className="w-full mb-6"
            />
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-slate-700">{t("estimatedLevel")}: <span className="text-primary font-bold">{abilityLevel}</span></p>
              <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                {t("abilityDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diagnostic Section: Missed Concepts */}
      {missedConceptTags && missedConceptTags.length > 0 && (
        <Card className="border-red-100 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {t("conceptGaps")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600/80 mb-4">
              {t("missedConceptsDescription")}
            </p>
            <div className="flex flex-wrap gap-2">
              {missedConceptTags.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-white border-red-200 text-red-700 px-3 py-1">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          {t("blockBreakdown")}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {blocks.map((block, idx) => (
            <Card key={idx} className="overflow-hidden border-slate-100 shadow-sm">
              <div className={cn(
                "h-1.5 w-full",
                block.difficultyBand === 'easy' ? "bg-green-400" :
                block.difficultyBand === 'medium' ? "bg-amber-400" : "bg-red-400"
              )} />
              <CardContent className="p-4 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">
                  {t("block")} {block.index + 1}
                </p>
                <Badge variant="secondary" className="mb-3 text-[10px] py-0 px-1.5 capitalize">
                  {t(block.difficultyBand)}
                </Badge>
                <div className="flex justify-center gap-1 mb-2">
                  {[0, 1].map(qIdx => (
                    <div 
                      key={qIdx} 
                      className={cn(
                        "w-3 h-3 rounded-full",
                        block.questions[qIdx]?.isCorrect ? "bg-green-500" : "bg-red-500"
                      )} 
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-slate-600">
                  {block.correctCount}/2 {t("correct")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Theta Progression Chart Placeholder */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t("abilityProgression")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
            <div className="flex items-end gap-4 h-32 w-full max-w-md px-8">
              {thetaProgression.map((p, i) => {
                const height = ((p.theta + 3) / 6) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-primary/20 border-t-2 border-primary rounded-t-sm transition-all" 
                      style={{ height: `${Math.max(10, height)}%` }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">B{p.blockNumber}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">
            {t("thetaProgressionNote")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
