"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

/**
 * Component to display the oral assessment question prompt.
 * 
 * @param {Object} props
 * @param {string} props.questionText - The question text to display
 * @param {string[]} props.keyConcepts - List of key concepts for the question
 */
export const AssessmentPrompt = ({ questionText, keyConcepts = [] }) => {
    const t = useTranslations('OralAssessment');

    return (
        <Card className="w-full bg-slate-50 border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                    {t('checkYourUnderstanding')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-slate-700 text-base mb-4 leading-relaxed">
                    {questionText}
                </p>
                
                {keyConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {keyConcepts.map((concept, index) => (
                            <Badge key={index} variant="secondary" className="bg-slate-200 text-slate-600 hover:bg-slate-200">
                                {concept}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AssessmentPrompt;
