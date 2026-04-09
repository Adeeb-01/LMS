import { auth } from "@/auth";
import { dbConnect } from "@/service/mongo";
import { Lesson } from "@/model/lesson.model";
import { Quiz } from "@/model/quizv2-model";
import { Question } from "@/model/questionv2-model";
import { LectureDocument } from "@/model/lecture-document.model";
import { GenerationJob } from "@/model/generation-job.model";
import { assertInstructorOwnsLesson } from "@/lib/authorization";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import GenerationTrigger from "./_components/generation-trigger";
import GeneratedQuestionsPreview from "./_components/generated-questions-preview";
import GenerationProgressWrapper from "./_components/generation-progress-wrapper";

export default async function GenerateQuestionsPage({ params }) {
  const t = await getTranslations("MCQGeneration");
  const { courseId, lessonId } = await params;

  const session = await auth();
  if (!session?.user) notFound();

  await dbConnect();

  // 1. Authorization
  try {
    await assertInstructorOwnsLesson(lessonId, session.user.id, session.user);
  } catch (error) {
    notFound();
  }

  // 2. Fetch data
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) notFound();

  const quiz = await Quiz.findOne({ lessonId }).lean();
  const doc = await LectureDocument.findOne({ lessonId, embeddingStatus: 'indexed' }).lean();
  
  // Fetch existing generated questions (drafts)
  const existingQuestions = await Question.find({ 
    quizId: quiz?._id,
    isDraft: true,
    generatedBy: 'gemini'
  }).lean();

  // Fetch active generation job
  const activeJob = await GenerationJob.findOne({
    lessonId,
    status: { $in: ['pending', 'processing'] }
  }).sort({ createdAt: -1 }).lean();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="w-full">
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="flex items-center text-sm hover:opacity-75 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {t("backToLesson")}
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <div className="p-2 bg-indigo-500/10 rounded-full">
                <Sparkles className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-medium">{t("title")}</h1>
                <p className="text-sm text-gray-500">{lesson.title}</p>
              </div>
            </div>
            
            <GenerationTrigger 
              courseId={courseId}
              lessonId={lessonId}
              quizId={quiz?._id?.toString()}
              hasExistingQuestions={existingQuestions.length > 0}
              hasIndexedContent={!!doc}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {activeJob ? (
          <GenerationProgressWrapper 
            jobId={activeJob._id.toString()} 
            initialJob={JSON.parse(JSON.stringify(activeJob))}
          />
        ) : (
          <>
            {existingQuestions.length > 0 ? (
              <GeneratedQuestionsPreview 
                questions={JSON.parse(JSON.stringify(existingQuestions))} 
              />
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="inline-flex p-4 bg-indigo-50 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{t("noQuestions")}</h3>
                <p className="text-gray-500 max-w-sm mx-auto mt-2">
                  {t("triggerDescription")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
