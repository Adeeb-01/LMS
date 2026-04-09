import { Link } from "@/i18n/navigation";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getLesson } from "@/app/actions/lesson";
import { notFound } from "next/navigation";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { assertInstructorOwnsCourse } from "@/lib/authorization";
import { dbConnect } from "@/service/mongo";
import { OralAssessment } from "@/model/oral-assessment.model";
import { AssessmentsDashboardClient } from "./_components/assessments-dashboard-client";

export default async function AssessmentsDashboardPage({ params }) {
  const t = await getTranslations("OralAssessment");
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
  await dbConnect();
  const [lesson, assessments] = await Promise.all([
    getLesson(lessonId),
    OralAssessment.find({ lessonId }).sort({ triggerTimestamp: 1 }).lean()
  ]);

  if (!lesson) {
    notFound();
  }

  // Convert MongoDB objects to plain objects for client component
  const plainAssessments = assessments.map(a => ({
    ...a,
    _id: a._id.toString(),
    courseId: a.courseId.toString(),
    lessonId: a.lessonId.toString(),
    createdBy: a.createdBy.toString(),
    createdAt: a.createdAt.toISOString()
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="w-full">
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="flex items-center text-sm hover:opacity-75 transition mb-6 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            Back to Course Setup
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-x-3">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <BrainCircuit className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Oral Assessments</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage interactive assessment points for <span className="font-semibold text-slate-700">{lesson.title}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssessmentsDashboardClient 
        courseId={courseId}
        lessonId={lessonId}
        initialAssessments={plainAssessments}
      />
    </div>
  );
}
