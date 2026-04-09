import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { getAssessmentPoints } from "@/app/actions/oral-assessment";
import { dbConnect } from "@/service/mongo";

/**
 * GET /api/oral-assessment/lesson/[lessonId]
 * Fetches all assessment points for a lesson.
 */
export async function GET(request, { params }) {
  await dbConnect();
  
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { lessonId } = params;
    const result = await getAssessmentPoints(lessonId);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[API_GET_ASSESSMENT_POINTS_ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
