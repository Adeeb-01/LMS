"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { changeCoursePublishState } from "@/app/actions/course";

/**
 * Button component to toggle course publish state.
 * Includes validation check and loading state.
 * 
 * @param {Object} props
 * @param {string} props.courseId - The ID of the course
 * @param {boolean} props.isPublished - Current publish status
 * @param {boolean} props.canPublish - Whether the course meets publish requirements
 * @param {Function} props.onPublishToggle - Callback after successful state change
 */
export const PublishButton = ({ 
  courseId, 
  isPublished, 
  canPublish, 
  onPublishToggle 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("CourseEdit");

  const onClick = async () => {
    try {
      setIsLoading(true);
      const result = await changeCoursePublishState(courseId);

      if (result.success) {
        toast.success(result.active ? t("coursePublished") : t("courseUnpublished"));
        if (onPublishToggle) onPublishToggle(result.active);
        router.refresh();
      } else if (result.canPublish === false) {
        toast.error(t("somethingWentWrong"));
      }
    } catch (error) {
      toast.error(error?.message || t("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={onClick}
      disabled={isLoading || (!isPublished && !canPublish)}
      variant="outline"
      size="sm"
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {isPublished ? t("unpublish") : t("publish")}
    </Button>
  );
};
