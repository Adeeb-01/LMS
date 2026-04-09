import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { transcribeAudio } from "@/lib/ai/transcription";
import { submitOralResponse } from "@/app/actions/oral-assessment";
import { dbConnect } from "@/service/mongo";

/**
 * POST /api/oral-assessment/[assessmentId]/submit
 * Receives an audio URL, transcribes it, and evaluates the response.
 */
export async function POST(request, { params }) {
  await dbConnect();
  
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = params;
    const body = await request.json();
    const { audioUrl, textResponse, lessonId, courseId, attemptNumber, inputMethod } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Verify enrollment
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");
    const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
    if (!isEnrolled && user.role !== 'admin' && user.role !== 'instructor') {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    let transcription;
    let finalInputMethod = inputMethod || 'voice';

    if (audioUrl) {
      // Voice submission: transcribe audio
      transcription = await transcribeAudio(audioUrl);
      
      if (!transcription) {
        return NextResponse.json({ ok: false, error: "Transcription failed or empty" }, { status: 400 });
      }
      finalInputMethod = 'voice';
    } else if (textResponse) {
      // Text submission: use text directly
      transcription = textResponse;
      finalInputMethod = 'text';
    } else {
      return NextResponse.json({ ok: false, error: "Either audioUrl or textResponse is required" }, { status: 400 });
    }

    // Submit for evaluation using the server action
    const result = await submitOralResponse({
      assessmentId,
      lessonId,
      courseId,
      transcription,
      inputMethod: finalInputMethod,
      attemptNumber: attemptNumber || 1
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[API_POST_ORAL_SUBMIT_ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
