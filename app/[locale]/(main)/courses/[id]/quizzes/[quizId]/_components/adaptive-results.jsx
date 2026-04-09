"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Info, Trophy, AlertCircle, LineChart, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultsReview } from "./results-review";

export function AdaptiveResults({ data, courseId }) {
  const t = useTranslations("Quiz");
  const { 
    finalTheta, 
    finalSE, 
    abilityLevel, 
    abilityPercentile, 
    confidenceInterval,
    terminationReason,
    summary,
    thetaProgression,
    questionReview
  } = data;

  // Simple SVG chart for θ progression
  const renderProgressionChart = () => {
    if (!thetaProgression || thetaProgression.length < 2) return null;

    const width = 400;
    const height = 150;
    const padding = 20;
    
    // Scale θ from [-3, 3] to [padding, height-padding]
    const scaleTheta = (theta) => {
      const normalized = (theta + 3) / 6; // [0, 1]
      return height - padding - (normalized * (height - 2 * padding));
    };

    const points = thetaProgression.map((h, i) => ({
      x: padding + (i / (thetaProgression.length - 1)) * (width - 2 * padding),
      y: scaleTheta(h.theta)
    }));

    const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;

    return (
      <div className="w-full overflow-hidden border rounded-lg bg-slate-50 p-4">
        <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-600">
          <LineChart className="w-4 h-4" />
          <span>{t("adaptive.stats.progression")}</span>
        </div>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto"
          role="img"
          aria-label="Ability Progression Chart showing theta values over time"
        >
          <title>Ability Progression (θ)</title>
          {/* Grid lines */}
          <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#e2e8f0" strokeDasharray="4" />
          <text x={padding-5} y={height/2} fontSize="8" fill="#94a3b8" textAnchor="end">0</text>
          
          {/* Progression path */}
          <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinejoin="round" />
          
          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="hsl(var(--primary))" strokeWidth="2" />
          ))}
        </svg>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>{t("adaptive.stats.start")}</span>
          <span>{t("adaptive.stats.questionNumber")}</span>
          <span>{t("adaptive.stats.end")}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Ability Summary Card */}
      <div className={cn(
        "relative overflow-hidden border rounded-2xl p-8 text-center transition-all",
        summary.passed ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
      )}>
        {summary.passed && (
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-24 h-24 text-green-600" />
          </div>
        )}
        
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-4">
          {summary.passed ? (
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          ) : (
            <XCircle className="w-10 h-10 text-red-600" />
          )}
        </div>

        <h2 className="text-xl font-bold mb-1">
          {t(`adaptive.abilityLevels.${abilityLevel}`) || abilityLevel} ({t("adaptive.abilityLevels.percentile", { percentile: Math.round(abilityPercentile) })})
        </h2>
        
        <div className="text-5xl font-black my-4 tracking-tighter text-slate-900">
          θ = {finalTheta.toFixed(2)}
        </div>

        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          {t(`adaptive.terminationReasons.${terminationReason}`) || terminationReason}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-200/50">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t("score")}</p>
            <p className="text-lg font-bold">{summary.scorePercent.toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t("questions")}</p>
            <p className="text-lg font-bold">{summary.totalQuestions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t("adaptive.stats.confidence")}</p>
            <p className="text-lg font-bold">±{(1.96 * finalSE).toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t("status")}</p>
            <Badge className={summary.passed ? "bg-green-600" : "bg-red-600"}>
              {summary.passed ? t("passed") : t("notPassed")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Analytics & Progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-6 bg-white space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Target className="w-5 h-5 text-primary" />
            <h3>{t("adaptive.stats.measurement")}</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>{t("adaptive.stats.standardError")}</span>
                <span>{finalSE.toFixed(3)}</span>
              </div>
              <Progress value={Math.max(0, 100 - finalSE * 100)} className="h-1.5" />
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed">
                {t("adaptive.stats.explanation", { 
                  lower: confidenceInterval.lower.toFixed(2), 
                  upper: confidenceInterval.upper.toFixed(2) 
                })}
              </p>
            </div>
          </div>
        </div>

        {renderProgressionChart()}
      </div>

      {/* Review */}
      {questionReview && (
        <ResultsReview 
          review={{ questions: questionReview.map(q => ({
            ...q,
            _id: q.questionId,
            studentAnswer: q.yourAnswer,
            points: 1 // Adaptive uses weighting
          })) }} 
          courseId={courseId} 
        />
      )}
    </div>
  );
}
