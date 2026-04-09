"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Info,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { 
  activateGeneratedQuestions, 
  deleteGeneratedQuestions,
  regenerateQuestionsForChunk
} from "@/app/actions/mcq-generation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/mcq-generation/difficulty-badge";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { cn } from "@/lib/utils";

const GeneratedQuestionsPreview = ({ questions }) => {
  const t = useTranslations("MCQGeneration");
  const params = useParams();
  const { lessonId } = params;
  
  const [expandedIds, setExpandedIds] = useState([]);
  const [processingIds, setProcessingIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRegenerate = async (q) => {
    if (!q.sourceChunkId) {
      toast.error("Source chunk missing for this question");
      return;
    }

    try {
      setProcessingIds(prev => [...prev, q._id]);
      toast.info("Regenerating questions from source chunk...");
      const result = await regenerateQuestionsForChunk(lessonId, q.quizId, q.sourceChunkId);
      if (result.ok) {
        toast.success(`Generated ${result.count} new questions!`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to regenerate questions");
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== q._id));
    }
  };

  const handleActivate = async (id) => {
    try {
      setProcessingIds(prev => [...prev, id]);
      const result = await activateGeneratedQuestions([id]);
      if (result.ok) {
        toast.success("Question activated!");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to activate question");
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleDelete = async (id) => {
    try {
      setProcessingIds(prev => [...prev, id]);
      const result = await deleteGeneratedQuestions([id]);
      if (result.ok) {
        toast.success("Question deleted");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete question");
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleActivateAll = async () => {
    const ids = questions.map(q => q._id);
    try {
      setProcessingIds(ids);
      const result = await activateGeneratedQuestions(ids);
      if (result.ok) {
        toast.success(`${result.activatedCount} questions activated!`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to activate all questions");
    } finally {
      setProcessingIds([]);
    }
  };

  const handleDeleteAll = async () => {
    const ids = questions.map(q => q._id);
    try {
      setProcessingIds(ids);
      const result = await deleteGeneratedQuestions(ids);
      if (result.ok) {
        toast.success(`${result.deletedCount} questions deleted`);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete all questions");
    } finally {
      setProcessingIds([]);
    }
  };

  if (questions.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generated Drafts ({questions.length})</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDeleteAll}
            disabled={processingIds.length > 0}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
          <Button 
            size="sm" 
            onClick={handleActivateAll}
            disabled={processingIds.length > 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Activate All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div 
            key={q._id} 
            className="border rounded-lg bg-white overflow-hidden shadow-sm"
          >
            <div 
              className="p-4 flex items-start justify-between cursor-pointer hover:bg-gray-50 transition"
              onClick={() => toggleExpand(q._id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase">Question {idx + 1}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase h-5">
                    {q.generatedBy === 'gemini' ? 'AI Generated' : 'Manual'}
                  </Badge>
                  {q.irt?.b !== undefined && (
                    <DifficultyBadge 
                      difficulty={{
                        bValue: q.irt.b,
                        bloomLevel: q.bloomLevel,
                        reasoning: q.difficultyReasoning
                      }} 
                    />
                  )}
                </div>
                <p className="font-medium text-gray-900 leading-tight">
                  {q.text}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  onClick={(e) => { e.stopPropagation(); handleRegenerate(q); }}
                  disabled={processingIds.includes(q._id)}
                  title="Regenerate from source"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); handleActivate(q._id); }}
                  disabled={processingIds.includes(q._id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => { e.stopPropagation(); handleDelete(q._id); }}
                  disabled={processingIds.includes(q._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {expandedIds.includes(q._id) ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>

            {expandedIds.includes(q._id) && (
              <div className="px-4 pb-4 pt-0 space-y-4 border-t bg-gray-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {q.options.map((opt) => (
                    <div 
                      key={opt.id}
                      className={cn(
                        "p-3 rounded-md border text-sm flex items-start gap-2",
                        q.correctOptionIds.includes(opt.id) 
                          ? "bg-green-50 border-green-200 text-green-900" 
                          : "bg-white border-gray-200 text-gray-700"
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                        q.correctOptionIds.includes(opt.id) 
                          ? "border-green-500 bg-green-500 text-white" 
                          : "border-gray-300"
                      )}>
                        {q.correctOptionIds.includes(opt.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                    <div className="flex items-center gap-2 mb-1 text-blue-800 font-medium text-xs uppercase">
                      <Info className="h-3.5 w-3.5" />
                      Explanation
                    </div>
                    <p className="text-sm text-blue-900 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeneratedQuestionsPreview;
