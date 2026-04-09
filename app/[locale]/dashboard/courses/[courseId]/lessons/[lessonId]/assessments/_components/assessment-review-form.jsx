"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  X, 
  Plus, 
  Loader2, 
  Save,
  Clock
} from "lucide-react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createOralAssessment, updateOralAssessment } from "@/app/actions/oral-assessment";

const formSchema = z.object({
  triggerTimestamp: z.coerce.number().min(0),
  questionText: z.string().min(10, "Question must be at least 10 characters"),
  referenceAnswer: z.string().min(10, "Reference answer must be at least 10 characters"),
  keyConcepts: z.array(z.string()).min(1, "At least one key concept is required"),
  passingThreshold: z.coerce.number().min(0.1).max(1.0).default(0.6),
});

export const AssessmentReviewForm = ({ 
  courseId, 
  lessonId, 
  initialData, 
  onSuccess, 
  onCancel 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conceptInput, setConceptInput] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      triggerTimestamp: initialData.triggerTimestamp,
      questionText: initialData.questionText,
      referenceAnswer: initialData.referenceAnswer,
      keyConcepts: initialData.keyConcepts || [],
      passingThreshold: initialData.passingThreshold || 0.6,
    } : {
      triggerTimestamp: 0,
      questionText: "",
      referenceAnswer: "",
      keyConcepts: [],
      passingThreshold: 0.6,
    },
  });

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      let result;
      if (initialData?.id) {
        // Update existing assessment
        result = await updateOralAssessment(initialData.id, values);
      } else {
        // Create new assessment
        result = await createOralAssessment(courseId, lessonId, values);
      }
      
      if (result.ok) {
        toast.success(initialData?.id ? "Assessment updated" : "Assessment created");
        onSuccess();
      } else {
        toast.error(result.error || "Failed to save assessment");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addConcept = () => {
    if (!conceptInput.trim()) return;
    const currentConcepts = form.getValues("keyConcepts");
    if (!currentConcepts.includes(conceptInput.trim())) {
      form.setValue("keyConcepts", [...currentConcepts, conceptInput.trim()]);
    }
    setConceptInput("");
  };

  const removeConcept = (concept) => {
    const currentConcepts = form.getValues("keyConcepts");
    form.setValue("keyConcepts", currentConcepts.filter(c => c !== concept));
  };

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {initialData ? "Edit Assessment" : "Add New Assessment"}
        </h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="triggerTimestamp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Trigger Timestamp (seconds)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 120" {...field} />
                  </FormControl>
                  <FormDescription>
                    When the question should pop up in the video.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passingThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passing Threshold (0.1 - 1.0)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0.1" max="1.0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Minimum semantic similarity score to pass.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="questionText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Text</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter the question for the student..." 
                    className="resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referenceAnswer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Answer</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter the ideal answer for comparison..." 
                    className="resize-none h-32"
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Used by AI to evaluate the student's spoken response.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <FormLabel>Key Concepts</FormLabel>
            <div className="flex gap-2">
              <Input 
                placeholder="Add a concept (e.g. 'Photosynthesis')" 
                value={conceptInput}
                onChange={(e) => setConceptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addConcept();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addConcept}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.watch("keyConcepts").map((concept, i) => (
                <Badge key={i} variant="secondary" className="gap-1 px-2 py-1">
                  {concept}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeConcept(concept)}
                  />
                </Badge>
              ))}
              {form.watch("keyConcepts").length === 0 && (
                <p className="text-xs text-slate-500 italic">No concepts added yet.</p>
              )}
            </div>
            {form.formState.errors.keyConcepts && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.keyConcepts.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {initialData ? "Update Assessment" : "Save Assessment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
