"use client";

import { useTranslations } from "next-intl";
import { IconBadge } from "@/components/icon-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger, 
} from "@/components/ui/dialog";
import { LayoutDashboard } from "lucide-react";
import { Eye } from "lucide-react";
import { Video } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LessonTitleForm } from "./lesson-title-form";
import { LessonDescriptionForm } from "./lesson-description-form";
import { LessonAccessForm } from "./lesson-access-form";
import { VideoUrlForm } from "./video-url-form";
import { LessonActions } from "./lesson-action";
import { useRouter } from "next/navigation";
import { PublishBadge } from "@/components/ui/publish-badge";
import { FileText, Sparkles } from "lucide-react";

export const LessonModal = ({ open, setOpen, courseId, lesson, moduleId }) => {
  const t = useTranslations("ChapterEdit");
  const tMCQ = useTranslations("MCQGeneration");
  const router = useRouter();

  function handleDelete() {
    // Close the modal
    setOpen(false);
    // Refresh the page to update the lesson list
    router.refresh();
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* <DialogTrigger>Open</DialogTrigger> */}
      <DialogContent
        className="sm:max-w-[1200px] w-[96%] overflow-y-auto max-h-[90vh]"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("lessonEditor")}</DialogTitle>
          <DialogDescription>
            {t("lessonEditorHint")}
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="flex items-center justify-between">
            <div className="w-full">
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="flex items-center text-sm hover:opacity-75 transition mb-6"
              >
                <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
                {t("backToCourseSetup")}
              </Link>
              <div className="flex items-center justify-between">
                <PublishBadge status={lesson?.active ? "published" : "draft"} />
                <LessonActions lesson={lesson} moduleId={moduleId} onDelete={handleDelete} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={LayoutDashboard} />
                  <h2 className="text-xl">{t("customizeChapter")}</h2>
                </div>
                <LessonTitleForm
                  initialData={{title: lesson?.title}}
                  courseId={courseId}
                  lessonId={lesson?.id}
                />
                <LessonDescriptionForm
                  initialData={{description: lesson?.description}}
                  courseId={courseId}
                  lessonId={lesson?.id}
                />
              </div>
              <div>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={Eye} />
                  <h2 className="text-xl">{t("accessSettings")}</h2>
                </div>
                <LessonAccessForm
                 initialData={{isFree: lesson?.access !== 'private'}}
                 courseId={courseId}
                 lessonId={lesson?.id}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={Video} />
                <h2 className="text-xl">{t("addVideo")}</h2>
              </div>
              <VideoUrlForm
                initialData={{
                  url: lesson?.video_url,
                  duration: lesson?.duration,
                  videoProvider: lesson?.videoProvider,
                  videoFilename: lesson?.videoFilename,
                  videoUrl: lesson?.videoUrl,
                  videoSize: lesson?.videoSize,
                  videoMimeType: lesson?.videoMimeType
                }}
                courseId={courseId}
                lessonId={lesson?.id}
              />
              
              <div className="mt-8 border bg-slate-100 rounded-md p-4">
                <div className="font-medium flex items-center justify-between mb-2">
                  <div className="flex items-center gap-x-2">
                    <IconBadge icon={FileText} />
                    <h2 className="text-xl">{t("studyMaterials")}</h2>
                  </div>
                  <Link 
                    href={`/dashboard/courses/${courseId}/lessons/${lesson?.id}/document`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t("manageDocument")}
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("studyMaterialsHint")}
                </p>
              </div>

              <div className="mt-4 border bg-indigo-50 border-indigo-100 rounded-md p-4">
                <div className="font-medium flex items-center justify-between mb-2">
                  <div className="flex items-center gap-x-2">
                    <IconBadge icon={Sparkles} />
                    <h2 className="text-xl text-indigo-900">{tMCQ("title")}</h2>
                  </div>
                  <Link 
                    href={`/dashboard/courses/${courseId}/lessons/${lesson?.id}/generate-questions`}
                    className="text-sm text-indigo-600 font-semibold hover:underline"
                  >
                    {tMCQ("trigger")}
                  </Link>
                </div>
                <p className="text-sm text-indigo-700/70">
                  {tMCQ("triggerDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
