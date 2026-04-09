import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { triggerOralGeneration as triggerQueueGeneration } from "@/service/oral-generation-queue";
import { LectureDocument } from "@/model/lecture-document.model";
import { OralGenerationJob } from "@/model/oral-generation-job.model";
import { Quiz } from "@/model/quizv2-model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import { triggerOralGenerationSchema } from "@/lib/validations";

/**
 * POST /api/oral-generation
 * Trigger Oral question generation for a lesson.
 */
export async function POST(request) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId } = triggerOralGenerationSchema.parse(body);

    // 1. Fetch document to get courseId and ensure indexing
    const doc = await LectureDocument.findOne({ lessonId, embeddingStatus: 'indexed' });
    if (!doc) {
      return NextResponse.json({ ok: false, error: "Lesson has no indexed content." }, { status: 400 });
    }

    // 2. Authorization
    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    if (!isOwner && !isAdmin(user)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 3. Ensure Quiz exists
    let quiz = await Quiz.findOne({ lessonId });
    if (!quiz) {
      // In a real scenario, we might want to create it here too if not provided, 
      // but the schema requires quizId.
      return NextResponse.json({ ok: false, error: "Quiz not found for this lesson." }, { status: 400 });
    }

    // 4. Check for active jobs
    const existingJob = await OralGenerationJob.findOne({
      lessonId,
      status: { $in: ['pending', 'processing'] }
    });
    if (existingJob) {
      return NextResponse.json({ ok: false, error: "Oral generation already in progress." }, { status: 409 });
    }

    // 5. Trigger
    const result = await triggerQueueGeneration({
      lessonId,
      courseId: doc.courseId,
      quizId: quiz._id,
      lectureDocumentId: doc._id,
      triggeredBy: user.id
    });

    return NextResponse.json({
      ok: true,
      jobId: result.jobId.toString()
    });

  } catch (error) {
    console.error("[API_POST_ORAL_GENERATION_ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Internal Server Error" 
    }, { status: 400 });
  }
}
