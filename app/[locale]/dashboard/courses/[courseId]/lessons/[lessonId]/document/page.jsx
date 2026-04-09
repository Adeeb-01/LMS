import { Link } from "@/i18n/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DocumentUpload } from "./_components/document-upload";
import { DocumentPreview } from "./_components/document-preview";
import EmbeddingStatus from "../_components/embedding-status";
import { getLectureDocumentByLesson } from "@/app/actions/lecture-document";
import { notFound } from "next/navigation";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { assertInstructorOwnsCourse } from "@/lib/authorization";

export default async function DocumentPage({ params }) {
  const t = await getTranslations("LectureDocument");
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

  // 3. Fetch existing document
  const result = await getLectureDocumentByLesson(lessonId);
  const initialData = result.success ? result.data : null;

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
              <div className="p-2 bg-blue-500/10 rounded-full">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <h1 className="text-2xl font-medium">{t("instructorView")}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DocumentUpload 
            courseId={courseId} 
            lessonId={lessonId} 
            initialData={initialData} 
          />
          <div className="space-y-4">
            <EmbeddingStatus 
              courseId={courseId} 
              lessonId={lessonId} 
            />
          </div>
        </div>

        {initialData?.status === 'ready' && (
          <DocumentPreview extractedText={initialData.extractedText} />
        )}
      </div>
    </div>
  );
}
