"use client";

import { useState } from "react";
import { 
  Plus, 
  Sparkles, 
  Loader2,
  AlertCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AssessmentList } from "./assessment-list";
import { AssessmentReviewForm } from "./assessment-review-form";
import { triggerOralAssessmentGeneration } from "@/app/actions/oral-assessment";

export const AssessmentsDashboardClient = ({ 
  courseId, 
  lessonId, 
  initialAssessments 
}) => {
  const router = useRouter();
  const [assessments, setAssessments] = useState(initialAssessments);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await triggerOralAssessmentGeneration(courseId, lessonId);
      if (result.ok) {
        toast.success(`Generated ${result.count} new assessments!`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to generate assessments");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (assessment) => {
    setEditingAssessment(assessment);
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingAssessment(null);
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingAssessment(null);
  };

  const handleSuccess = () => {
    setIsAddingNew(false);
    setEditingAssessment(null);
    router.refresh();
  };

  const handleDelete = async (id) => {
    // In a real app, you'd call a delete action here
    toast.info("Delete functionality would be implemented here.");
  };

  const pendingCount = assessments.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/30 border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-900">Total Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{assessments.length}</div>
            <p className="text-xs text-blue-600 mt-1">Interactive points in video</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/30 border-amber-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-900">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900">{pendingCount}</div>
            <p className="text-xs text-amber-600 mt-1">AI-generated points needing approval</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/30 border-green-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900">Active Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {assessments.filter(a => a.status === 'approved').length}
            </div>
            <p className="text-xs text-green-600 mt-1">Currently visible to students</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-grow space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Assessment Points</h2>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate with AI
              </Button>
              <Button onClick={handleAddNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Manually
              </Button>
            </div>
          </div>

          {(isAddingNew || editingAssessment) && (
            <AssessmentReviewForm 
              courseId={courseId}
              lessonId={lessonId}
              initialData={editingAssessment}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          )}

          <AssessmentList 
            items={assessments} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        <div className="w-full md:w-80 space-y-6 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-400" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 space-y-4">
              <p>
                Oral assessments are triggered at specific timestamps while students watch the lecture video.
              </p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</div>
                  <p>AI analyzes the transcript to find key learning moments.</p>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
                  <p>Review and approve the generated questions.</p>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</div>
                  <p>Students record their answers, and AI evaluates them semantically.</p>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>Ensure the video alignment is complete before generating assessments for accurate timestamps.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
