import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Renders a confidence indicator for alignment results.
 * @param {number} confidence - Confidence score (0-100)
 * @param {string} status - Alignment status ('aligned', 'not-spoken', 'unable-to-align')
 */
export function ConfidenceIndicator({ confidence, status, className }) {
  const t = useTranslations("Alignment");

  if (status === 'not-spoken') {
    return (
      <Badge variant="secondary" className={cn("gap-1 text-gray-500", className)}>
        <AlertCircle className="h-3 w-3" />
        {t("notSpoken")}
      </Badge>
    );
  }

  if (status === 'unable-to-align') {
    return (
      <Badge variant="destructive" className={cn("gap-1", className)}>
        <XCircle className="h-3 w-3" />
        {t("unableToAlign")}
      </Badge>
    );
  }

  // Aligned - Color-coded based on confidence
  let colorClass = "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
  let Icon = CheckCircle2;
  let label = t("highConfidence");

  if (confidence < 70) {
    colorClass = "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
    Icon = XCircle;
    label = t("lowConfidence");
  } else if (confidence < 85) {
    colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
    Icon = AlertCircle;
    label = t("moderateConfidence");
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1 shadow-none transition-all", colorClass, className)}
      title={`${confidence}% ${t("alignmentStatus").toLowerCase()}`}
    >
      <Icon className="h-3 w-3" />
      {label} ({confidence}%)
    </Badge>
  );
}
