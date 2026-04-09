import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { AlignmentJob } from "@/model/alignment-job.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * GET /api/alignments/job/[jobId]
 * Gets status of a specific alignment job.
 * Authorization: Course instructor only.
 */
export async function GET(request, { params }) {
  await dbConnect();
  const { jobId } = await params;

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const job = await AlignmentJob.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    // 1. Authorization check: Instructor owns course or admin
    const isOwner = await verifyInstructorOwnsCourse(job.courseId, user.id, user);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !adminAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Return job status info
    return NextResponse.json({
      success: true,
      data: {
        id: job._id.toString(),
        lessonId: job.lessonId.toString(),
        courseId: job.courseId.toString(),
        status: job.status,
        phase: job.phase,
        progress: job.progress,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt
      }
    });

  } catch (error) {
    console.error("API Get Alignment Job Status Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
