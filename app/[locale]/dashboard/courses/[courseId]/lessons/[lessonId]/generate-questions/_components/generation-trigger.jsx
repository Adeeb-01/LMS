"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { triggerGeneration } from "@/app/actions/mcq-generation";
import { triggerIndexing } from "@/app/actions/indexing";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const GenerationTrigger = ({ 
  courseId, 
  lessonId, 
  quizId, 
  hasExistingQuestions,
  hasIndexedContent,
  lectureDocumentId
}) => {
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const router = useRouter();

  const handleTrigger = async () => {
    try {
      setLoading(true);
      const result = await triggerGeneration(lessonId, quizId);
      
      if (result.ok) {
        toast.success("MCQ generation started!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to start generation");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleIndexNow = async () => {
    if (!lectureDocumentId) return;
    try {
      setIndexing(true);
      const result = await triggerIndexing(lectureDocumentId);
      if (result.success) {
        toast.success("Indexing started! This page will refresh when ready.");
        setTimeout(() => router.refresh(), 5000);
      } else {
        toast.error(result.error || "Failed to start indexing");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIndexing(false);
    }
  };

  if (!hasIndexedContent) {
    return (
      <div className="flex items-center gap-3 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg text-yellow-600">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm">Please index the lecture document first.</span>
        {lectureDocumentId && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 border-yellow-500/30 text-yellow-700 hover:bg-yellow-500/10"
            onClick={handleIndexNow}
            disabled={indexing}
          >
            {indexing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5 mr-1.5" />
            )}
            Index Now
          </Button>
        )}
      </div>
    );
  }

  const TriggerButton = (
    <Button 
      disabled={loading} 
      className="bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      Generate MCQs with AI
    </Button>
  );

  if (hasExistingQuestions) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          {TriggerButton}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This lesson already has generated questions. Starting a new generation will create more questions. Existing questions will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTrigger}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div onClick={handleTrigger} className="inline-block">
      {TriggerButton}
    </div>
  );
};

export default GenerationTrigger;
