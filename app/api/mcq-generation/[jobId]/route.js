import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { GenerationJob } from "@/model/generation-job.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";

/**
 * GET /api/mcq-generation/[jobId]
 * Polls the status of an MCQ generation job.
 */
export async function GET(request, { params }) {
  await dbConnect();
  const { jobId } = await params;

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const job = await GenerationJob.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }

    // 1. Authorization check: Instructor owns course or admin
    const isOwner = await verifyInstructorOwnsCourse(job.courseId, user.id, user);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !adminAccess) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Return job status info
    return NextResponse.json({
      ok: true,
      job: {
        id: job._id.toString(),
        status: job.status,
        progress: {
          chunksTotal: job.chunksTotal,
          chunksProcessed: job.chunksProcessed,
          questionsGenerated: job.questionsGenerated,
          questionsFlagged: job.questionsFlagged,
          percentComplete: job.chunksTotal > 0 ? Math.round((job.chunksProcessed / job.chunksTotal) * 100) : 0
        },
        chunkErrors: job.chunkErrors || [],
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage
      }
    });

  } catch (error) {
    console.error("[API_GET_MCQ_JOB_STATUS_ERROR]", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
