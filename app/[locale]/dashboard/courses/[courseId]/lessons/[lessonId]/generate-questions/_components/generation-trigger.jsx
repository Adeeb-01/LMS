"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const GenerationTrigger = ({ 
  courseId, 
  lessonId, 
  quizId, 
  hasExistingQuestions,
  hasIndexedContent
}) => {
  const [loading, setLoading] = useState(false);
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

  if (!hasIndexedContent) {
    return (
      <div className="flex items-center gap-2 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg text-yellow-600">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">Please index the lecture document first.</span>
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
