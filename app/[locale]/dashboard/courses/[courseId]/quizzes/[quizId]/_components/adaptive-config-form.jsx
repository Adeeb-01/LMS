"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateQuizAdaptiveConfig, updateQuizBatConfig } from "@/app/actions/quizv2";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Info, Layers } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdaptiveConfigForm({ quiz }) {
    const t = useTranslations("Quiz");
    const router = useRouter();
    const [warnings, setWarnings] = useState([]);
    const [batWarnings, setBatWarnings] = useState([]);

    const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            enabled: quiz.adaptiveConfig?.enabled ?? false,
            precisionThreshold: quiz.adaptiveConfig?.precisionThreshold ?? 0.30,
            minQuestions: quiz.adaptiveConfig?.minQuestions ?? 5,
            maxQuestions: quiz.adaptiveConfig?.maxQuestions ?? 30,
            initialTheta: quiz.adaptiveConfig?.initialTheta ?? 0.0,
            
            batEnabled: quiz.batConfig?.enabled ?? false,
            batInitialTheta: quiz.batConfig?.initialTheta ?? 0.0,
        }
    });

    const isEnabled = watch("enabled");
    const isBatEnabled = watch("batEnabled");

    const onSubmitAdaptive = async (data) => {
        try {
            const result = await updateQuizAdaptiveConfig(quiz.id, {
                enabled: data.enabled,
                precisionThreshold: Number(data.precisionThreshold),
                minQuestions: Number(data.minQuestions),
                maxQuestions: Number(data.maxQuestions),
                initialTheta: Number(data.initialTheta),
            });

            if (result.ok) {
                toast.success(t("adaptiveConfigUpdated"));
                setWarnings(result.warnings || []);
                if (data.enabled) {
                    setValue("batEnabled", false);
                }
                router.refresh();
            } else {
                toast.error(result.error || t("failedUpdateAdaptiveConfig"));
            }
        } catch (error) {
            toast.error(t("failedUpdateAdaptiveConfig"));
        }
    };

    const onSubmitBat = async (data) => {
        try {
            const result = await updateQuizBatConfig(quiz.id, {
                enabled: data.batEnabled,
                initialTheta: Number(data.batInitialTheta),
                blockSize: 2, // Fixed for now
                totalBlocks: 5, // Fixed for now
            });

            if (result.ok) {
                toast.success(t("batConfigUpdated") || "BAT configuration updated");
                setBatWarnings(result.warnings || []);
                if (data.batEnabled) {
                    setValue("enabled", false);
                }
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update BAT configuration");
            }
        } catch (error) {
            toast.error("Failed to update BAT configuration");
        }
    };

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-500" />
                    {t("advancedTestingConfig") || "Advanced Testing Configuration"}
                </CardTitle>
                <CardDescription>
                    {t("advancedTestingDescription") || "Configure adaptive testing or block-based adaptive testing (BAT) for this quiz."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={isBatEnabled ? "bat" : "adaptive"} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="adaptive">{t("standardAdaptive") || "Standard Adaptive"}</TabsTrigger>
                        <TabsTrigger value="bat">{t("blockAdaptive") || "Block Adaptive (BAT)"}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="adaptive">
                        <form onSubmit={handleSubmit(onSubmitAdaptive)} className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                <div className="space-y-0.5">
                                    <Label htmlFor="enabled" className="text-base font-semibold">
                                        {t("enableAdaptiveMode")}
                                    </Label>
                                    <p className="text-sm text-slate-500">
                                        {t("adaptiveModeHint")}
                                    </p>
                                </div>
                                <Switch
                                    id="enabled"
                                    checked={isEnabled}
                                    onCheckedChange={(checked) => {
                                        setValue("enabled", checked);
                                        if (checked) setValue("batEnabled", false);
                                    }}
                                />
                            </div>

                            {isEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg animate-in fade-in slide-in-from-top-2">
                                    {/* Precision Threshold */}
                                    <div className="space-y-2">
                                        <Label htmlFor="precisionThreshold">
                                            {t("precisionThreshold")} (SE)
                                        </Label>
                                        <Input
                                            id="precisionThreshold"
                                            type="number"
                                            step="0.01"
                                            min="0.1"
                                            max="1.0"
                                            {...register("precisionThreshold", { 
                                                required: true,
                                                min: 0.1,
                                                max: 1.0
                                            })}
                                        />
                                        <p className="text-xs text-slate-500">
                                            {t("precisionThresholdHint")}
                                        </p>
                                    </div>

                                    {/* Initial Theta */}
                                    <div className="space-y-2">
                                        <Label htmlFor="initialTheta">
                                            {t("initialAbilityEstimate")} (θ)
                                        </Label>
                                        <Input
                                            id="initialTheta"
                                            type="number"
                                            step="0.1"
                                            {...register("initialTheta")}
                                        />
                                        <p className="text-xs text-slate-500">
                                            {t("initialThetaHint")}
                                        </p>
                                    </div>

                                    {/* Min Questions */}
                                    <div className="space-y-2">
                                        <Label htmlFor="minQuestions">
                                            {t("minQuestions")}
                                        </Label>
                                        <Input
                                            id="minQuestions"
                                            type="number"
                                            min="1"
                                            {...register("minQuestions", { 
                                                required: true,
                                                min: 1
                                            })}
                                        />
                                        <p className="text-xs text-slate-500">
                                            {t("minQuestionsHint")}
                                        </p>
                                    </div>

                                    {/* Max Questions */}
                                    <div className="space-y-2">
                                        <Label htmlFor="maxQuestions">
                                            {t("maxQuestions")}
                                        </Label>
                                        <Input
                                            id="maxQuestions"
                                            type="number"
                                            min="5"
                                            {...register("maxQuestions", { 
                                                required: true,
                                                min: 5
                                            })}
                                        />
                                        <p className="text-xs text-slate-500">
                                            {t("maxQuestionsHint")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {warnings.length > 0 && (
                                <Alert variant="warning" className="bg-amber-50 border-amber-200">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800">{t("readinessWarnings")}</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc list-inside text-sm text-amber-700">
                                            {warnings.map((warning, i) => (
                                                <li key={i}>
                                                    {typeof warning === 'string' ? warning : t(`adaptive.warnings.${warning.key}`, { count: warning.count })}
                                                </li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? t("saving") : t("saveConfig")}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="bat">
                        <form onSubmit={handleSubmit(onSubmitBat)} className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                <div className="space-y-0.5">
                                    <Label htmlFor="batEnabled" className="text-base font-semibold">
                                        {t("enableBatMode") || "Enable Block Adaptive Mode (BAT)"}
                                    </Label>
                                    <p className="text-sm text-slate-500">
                                        {t("batModeHint") || "Groups questions into blocks of 2. Reduces server load and provides psychological stability."}
                                    </p>
                                </div>
                                <Switch
                                    id="batEnabled"
                                    checked={isBatEnabled}
                                    onCheckedChange={(checked) => {
                                        setValue("batEnabled", checked);
                                        if (checked) setValue("enabled", false);
                                    }}
                                />
                            </div>

                            {isBatEnabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg animate-in fade-in slide-in-from-top-2">
                                    {/* Initial Theta */}
                                    <div className="space-y-2">
                                        <Label htmlFor="batInitialTheta">
                                            {t("initialAbilityEstimate")} (θ)
                                        </Label>
                                        <Input
                                            id="batInitialTheta"
                                            type="number"
                                            step="0.1"
                                            {...register("batInitialTheta")}
                                        />
                                        <p className="text-xs text-slate-500">
                                            {t("initialThetaHint")}
                                        </p>
                                    </div>

                                    {/* Fixed Settings Info */}
                                    <div className="space-y-2 p-3 bg-blue-50 rounded border border-blue-100">
                                        <Label className="text-blue-800 flex items-center gap-1">
                                            <Info className="w-4 h-4" />
                                            {t("batFixedSettings") || "Fixed Settings"}
                                        </Label>
                                        <ul className="text-xs text-blue-700 space-y-1">
                                            <li>• {t("batBlockSize") || "Block Size"}: 2 questions</li>
                                            <li>• {t("batTotalBlocks") || "Total Blocks"}: 5 blocks (10 questions total)</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {batWarnings.length > 0 && (
                                <Alert variant="warning" className="bg-amber-50 border-amber-200">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800">{t("readinessWarnings")}</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc list-inside text-sm text-amber-700">
                                            {batWarnings.map((warning, i) => (
                                                <li key={i}>
                                                    {warning.key === "insufficientBatPool" ? (
                                                        <span>
                                                            {t("insufficientBatPool") || "Insufficient question pool for BAT. Need at least 4 questions per difficulty band."}
                                                            <div className="mt-1 ml-4 grid grid-cols-3 gap-2 text-xs font-mono">
                                                                <div className={warning.counts.easy < 4 ? "text-red-600" : "text-green-600"}>Easy: {warning.counts.easy}/4</div>
                                                                <div className={warning.counts.medium < 4 ? "text-red-600" : "text-green-600"}>Medium: {warning.counts.medium}/4</div>
                                                                <div className={warning.counts.hard < 4 ? "text-red-600" : "text-green-600"}>Hard: {warning.counts.hard}/4</div>
                                                            </div>
                                                        </span>
                                                    ) : (
                                                        warning.message || JSON.stringify(warning)
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? t("saving") : t("saveConfig")}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
