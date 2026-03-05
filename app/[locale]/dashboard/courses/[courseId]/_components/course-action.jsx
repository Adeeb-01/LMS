"use client";

import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteCourse } from "@/app/actions/course";
import { PublishButton } from "./publish-button";

export const CourseActions = ({ courseId, isActive, canPublish }) => {
    const t = useTranslations("CourseEdit");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const onDelete = async () => {
        try {
            setIsLoading(true);
            if (isActive) {
                toast.error(t("publishedCannotDelete"));
                return;
            }
            
            await deleteCourse(courseId);
            toast.success(t("courseDeleted"));
            router.push(`/dashboard/courses`);
            router.refresh();
        } catch (error) {
            toast.error(error?.message || t("somethingWentWrong"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-x-2">
            <PublishButton 
                courseId={courseId}
                isPublished={isActive}
                canPublish={canPublish}
            />
            <Button 
                size="sm" 
                onClick={onDelete}
                disabled={isLoading}
                variant="outline"
            >
                <Trash className="h-4 w-4" />
            </Button>
        </div>
    );
};
