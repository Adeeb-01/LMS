"use client";

import { useState } from "react";
import { 
  Clock, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reviewOralAssessment } from "@/app/actions/oral-assessment";

export const AssessmentList = ({ items, onEdit, onDelete }) => {
  const [assessments, setAssessments] = useState(items);
  const [isUpdating, setIsUpdating] = useState(null);

  const handleStatusUpdate = async (id, status) => {
    setIsUpdating(id);
    try {
      const result = await reviewOralAssessment(id, status);
      if (result.ok) {
        toast.success(`Assessment ${status}`);
        setAssessments(prev => prev.map(a => 
          a._id === id ? { ...a, status } : a
        ));
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsUpdating(null);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <Clock className="h-10 w-10 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No assessments found</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
          Generate assessments using the AI pipeline or add them manually.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment) => (
        <div
          key={assessment._id}
          className={cn(
            "flex flex-col md:flex-row md:items-center gap-4 p-4 bg-white border rounded-lg shadow-sm transition-all",
            assessment.status === 'pending' && "border-amber-200 bg-amber-50/10",
            assessment.status === 'rejected' && "opacity-75"
          )}
        >
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 text-slate-600 font-bold text-xs">
              {formatTime(assessment.triggerTimestamp)}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    assessment.status === 'approved' ? 'success' : 
                    assessment.status === 'pending' ? 'warning' : 'destructive'
                  }
                  className="text-[10px] uppercase px-1.5 py-0"
                >
                  {assessment.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex-grow min-w-0">
            <p className="text-sm font-medium text-slate-900 line-clamp-2">
              {assessment.questionText}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Concepts:</span>
              <div className="flex flex-wrap gap-1">
                {assessment.keyConcepts?.slice(0, 3).map((concept, i) => (
                  <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {concept}
                  </span>
                ))}
                {assessment.keyConcepts?.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{assessment.keyConcepts.length - 3} more</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {assessment.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                  onClick={() => handleStatusUpdate(assessment._id, 'approved')}
                  disabled={isUpdating === assessment._id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleStatusUpdate(assessment._id, 'rejected')}
                  disabled={isUpdating === assessment._id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(assessment)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onDelete(assessment._id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
};
