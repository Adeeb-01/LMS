import { dbConnect } from "@/service/mongo";
import { PipelineJob } from "@/model/pipeline-job.model";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { NextResponse } from "next/server";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * GET /api/pipeline/[lessonId]/status
 * Returns the current status of the pipeline for a lesson.
 */
export async function GET(req, { params }) {
  try {
    const { lessonId } = params;
    await dbConnect();

    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the latest pipeline for this lesson
    const pipeline = await PipelineJob.findOne({ lessonId })
      .sort({ createdAt: -1 })
      .lean();

    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline job not found" }, { status: 404 });
    }

    // Authorization check: Must be instructor of course OR admin
    // For simplicity, we just check if instructor owns course
    const { verifyInstructorOwnsCourse, isAdmin } = await import("@/lib/authorization");
    const isOwner = await verifyInstructorOwnsCourse(pipeline.courseId, user.id, user);
    const adminAccess = isAdmin(user);

    if (!isOwner && !adminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      pipeline: replaceMongoIdInObject(pipeline) 
    });

  } catch (error) {
    console.error("GET Pipeline Status API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
