import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { OralGenerationJob } from "@/model/oral-generation-job.model";
import { NextResponse } from "next/server";
import { assertInstructorOwnsLesson } from "@/lib/authorization";

/**
 * GET /api/oral-generation/[jobId]
 * Returns oral generation job progress.
 */
export async function GET(request, { params }) {
  await dbConnect();

  try {
    const { jobId } = params;
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const job = await OralGenerationJob.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    // Authorization
    try {
      await assertInstructorOwnsLesson(job.lessonId, user.id, user);
    } catch (authError) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      job: {
        id: job._id.toString(),
        status: job.status,
        progress: {
          chunksTotal: job.chunksTotal,
          chunksProcessed: job.chunksProcessed,
          chunksSkipped: job.chunksSkipped,
          questionsGenerated: job.questionsGenerated,
          questionsFlagged: job.questionsFlagged,
          percentComplete: job.chunksTotal > 0 ? Math.round((job.chunksProcessed / job.chunksTotal) * 100) : 0
        },
        errors: job.chunkErrors || [],
        startedAt: job.startedAt,
        completedAt: job.completedAt
      }
    });

  } catch (error) {
    console.error("[API_GET_ORAL_STATUS_ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}
