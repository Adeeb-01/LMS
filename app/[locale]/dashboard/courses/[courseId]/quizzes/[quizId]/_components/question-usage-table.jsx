"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function QuestionUsageTable({ usage }) {
    const t = useTranslations("Quiz");

    if (!usage || usage.length === 0) {
        return <div className="text-center p-8 border rounded-lg bg-slate-50 text-slate-500">{t("noQuestionUsageData")}</div>;
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[40%]">{t("questionText")}</TableHead>
                        <TableHead className="text-center">{t("selectionRate")}</TableHead>
                        <TableHead className="text-center">{t("successRate")}</TableHead>
                        <TableHead className="text-center">{t("calibratedDiff")}</TableHead>
                        <TableHead className="text-center">{t("observedDiff")}</TableHead>
                        <TableHead className="text-right">{t("status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usage.map((q) => (
                        <TableRow key={q.questionId}>
                            <TableCell className="font-medium">
                                <p className="line-clamp-2 text-sm">{q.text}</p>
                            </TableCell>
                            <TableCell className="text-center">
                                {(q.selectionRate * 100).toFixed(1)}%
                                <p className="text-[10px] text-slate-400">n={q.timesSelected}</p>
                            </TableCell>
                            <TableCell className="text-center">
                                {(q.successRate * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center text-slate-500 italic">
                                {q.calibratedDifficulty.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                                {q.timesSelected > 5 ? q.observedDifficulty.toFixed(2) : "--"}
                            </TableCell>
                            <TableCell className="text-right">
                                {q.flaggedForRecalibration ? (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {t("drifted")}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t("driftWarning", { drift: q.drift.toFixed(2) })}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ) : q.timesSelected > 10 ? (
                                    <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-100">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        {t("stable")}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-slate-400 border-slate-200">
                                        {t("insufficientData")}
                                    </Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
