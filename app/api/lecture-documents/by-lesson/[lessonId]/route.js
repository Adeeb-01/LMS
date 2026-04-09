import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { LectureDocument } from "@/model/lecture-document.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import { hasEnrollmentForCourse } from "@/queries/enrollments";

export async function GET(request, { params }) {
  await dbConnect();
  const { lessonId } = await params;

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const doc = await LectureDocument.findOne({ lessonId }).lean();
    if (!doc) {
      return new NextResponse(null, { status: 204 });
    }

    // Authorization check
    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(doc.courseId, user.id);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !isEnrolled && !adminAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: doc._id.toString(),
        lessonId: doc.lessonId.toString(),
        courseId: doc.courseId.toString(),
        originalFilename: doc.originalFilename,
        fileSize: doc.fileSize,
        status: doc.status,
        extractedText: doc.extractedText,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }
    });

  } catch (error) {
    console.error("API Get Lecture Document By Lesson Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
