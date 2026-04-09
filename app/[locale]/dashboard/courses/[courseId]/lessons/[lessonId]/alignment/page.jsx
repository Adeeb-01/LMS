import { Link } from "@/i18n/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AlignmentReview } from "./_components/alignment-review";
import { getAlignmentStatus, getAlignments } from "@/app/actions/alignment";
import { getLectureDocumentByLesson } from "@/app/actions/lecture-document";
import { getLesson } from "@/app/actions/lesson";
import { notFound } from "next/navigation";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { assertInstructorOwnsCourse } from "@/lib/authorization";

export default async function AlignmentReviewPage({ params }) {
  const t = await getTranslations("Alignment");
  const { courseId, lessonId } = await params;

  // 1. Authentication
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) {
    notFound();
  }

  // 2. Authorization
  try {
    await assertInstructorOwnsCourse(courseId, loggedInUser.id, loggedInUser);
  } catch (error) {
    notFound();
  }

  // 3. Fetch Data
  const [lesson, docResult, alignmentStatus, alignmentsResult] = await Promise.all([
    getLesson(lessonId),
    getLectureDocumentByLesson(lessonId),
    getAlignmentStatus(lessonId, courseId),
    getAlignments(lessonId, courseId)
  ]);

  if (!lesson || !docResult.success) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="w-full">
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="flex items-center text-sm hover:opacity-75 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {t("backToCourseSetup")}
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-medium">{t("reviewAlignment")}</h1>
                <p className="text-sm text-slate-500">
                  {lesson.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto">
        <AlignmentReview 
          courseId={courseId} 
          lessonId={lessonId} 
          lesson={lesson}
          document={docResult.data}
          status={alignmentStatus}
          alignments={alignmentsResult.success ? alignmentsResult.data.alignments : []}
        />
      </div>
    </div>
  );
}
