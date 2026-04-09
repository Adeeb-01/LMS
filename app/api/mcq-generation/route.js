import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { triggerGeneration as triggerQueueGeneration } from "@/service/mcq-generation-queue";
import { LectureDocument } from "@/model/lecture-document.model";
import { GenerationJob } from "@/model/generation-job.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import { triggerGenerationSchema } from "@/lib/validations";

/**
 * POST /api/mcq-generation
 * Trigger MCQ generation for a lesson.
 * (Internal or authenticated instructor trigger)
 */
export async function POST(request) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, quizId } = triggerGenerationSchema.parse(body);

    // 1. Authorization: Instructor who owns the course/lesson or admin
    // Fetch document to get courseId
    const doc = await LectureDocument.findOne({ lessonId, embeddingStatus: 'indexed' });
    if (!doc) {
      return NextResponse.json({ ok: false, error: "Lesson has no indexed content." }, { status: 400 });
    }

    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    const adminAccess = isAdmin(user);
    if (!isOwner && !adminAccess) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 2. Check for existing active jobs
    const existingJob = await GenerationJob.findOne({
      lessonId,
      status: { $in: ['pending', 'processing'] }
    });
    if (existingJob) {
      return NextResponse.json({ ok: false, error: "Generation already in progress." }, { status: 409 });
    }

    // 3. Trigger background job
    const result = await triggerQueueGeneration({
      lessonId,
      courseId: doc.courseId,
      quizId,
      lectureDocumentId: doc._id,
      triggeredBy: user.id
    });

    return NextResponse.json({
      ok: true,
      jobId: result.jobId.toString()
    });

  } catch (error) {
    console.error("[API_POST_TRIGGER_GENERATION_ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Internal Server Error" 
    }, { status: 400 });
  }
}
