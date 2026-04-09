"use client";

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Component to visualize the semantic similarity score.
 * 
 * @param {Object} props
 * @param {number} props.score - Similarity score (0 to 1)
 * @param {boolean} props.passed - Whether the score passed the threshold
 * @param {number} props.threshold - Minimum passing score (default: 0.6)
 */
export const SimilarityResult = ({ score, passed, threshold = 0.6 }) => {
    const t = useTranslations('OralAssessment');
    
    // Convert 0-1 score to 0-100 percentage
    const percentage = Math.round(score * 100);
    
    // Determine color based on score and pass/fail
    const getScoreColor = () => {
        if (passed) return 'text-green-600';
        if (score >= threshold * 0.8) return 'text-amber-600';
        return 'text-red-600';
    };

    const getProgressColor = () => {
        if (passed) return 'bg-green-500';
        if (score >= threshold * 0.8) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : score >= threshold * 0.8 ? (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium text-slate-700">{t('yourScore')}</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor()}`}>
                    {percentage}%
                </div>
            </div>

            <div className="space-y-2">
                <Progress value={percentage} className="h-2" indicatorClassName={getProgressColor()} />
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>0%</span>
                    <div className="flex flex-col items-center">
                        <div className="h-1 w-px bg-slate-300 mb-1" style={{ marginLeft: `${threshold * 100}%` }} />
                        <span>{t('passingThreshold', { threshold: threshold * 100 })}</span>
                    </div>
                    <span>100%</span>
                </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className={`text-sm ${passed ? 'text-green-700' : 'text-slate-600'}`}>
                    {passed ? t('passedMessage') : t('failedMessage')}
                </p>
            </div>
        </div>
    );
};

export default SimilarityResult;
