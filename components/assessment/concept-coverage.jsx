"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Component to display which concepts were addressed or missing in a student response.
 * 
 * @param {Object} props
 * @param {string[]} props.addressed - List of addressed concepts
 * @param {string[]} props.missing - List of missing concepts
 */
export const ConceptCoverage = ({ addressed = [], missing = [] }) => {
    const t = useTranslations('OralAssessment');

    return (
        <div className="w-full space-y-6">
            {addressed.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {t('conceptsCovered')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {addressed.map((concept, index) => (
                            <Badge key={index} variant="secondary" className="bg-green-50 text-green-700 border-green-100">
                                {concept}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {missing.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        {t('conceptsMissing')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {missing.map((concept, index) => (
                            <Badge key={index} variant="secondary" className="bg-red-50 text-red-700 border-red-100">
                                {concept}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConceptCoverage;
