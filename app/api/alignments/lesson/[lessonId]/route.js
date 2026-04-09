import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { VideoTranscript } from "@/model/video-transcript.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * GET /api/alignments/lesson/[lessonId]?courseId=...
 * Gets alignment data for a lesson.
 */
export async function GET(request, { params }) {
  await dbConnect();
  const { lessonId } = await params;
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return NextResponse.json({ success: false, error: "Missing courseId parameter" }, { status: 400 });
  }

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Authorization check
    const isOwner = await verifyInstructorOwnsCourse(courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !isEnrolled && !adminAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // 2. Fetch transcript with alignments
    const transcript = await VideoTranscript.findOne({ lessonId })
      .select('alignments alignmentStatus language duration')
      .lean();

    if (!transcript) {
      return NextResponse.json({ success: false, error: "Alignment data not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: replaceMongoIdInObject(transcript)
    });

  } catch (error) {
    console.error("API Get Alignments Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
