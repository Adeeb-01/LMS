import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { transcribeAudio } from "@/lib/ai/transcription";
import { askTutor } from "@/app/actions/rag-tutor";
import { dbConnect } from "@/service/mongo";

/**
 * POST /api/rag-tutor/query
 * Receives an audio URL, transcribes it, and queries the RAG tutor.
 */
export async function POST(request) {
  await dbConnect();
  
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { audioUrl, question, lessonId, courseId } = body;

    if (!lessonId || !courseId) {
      return NextResponse.json({ ok: false, error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }

    // Verify enrollment
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");
    const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
    if (!isEnrolled && user.role !== 'admin' && user.role !== 'instructor') {
        return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    let finalQuestion;
    let inputMethod = 'voice';

    if (audioUrl) {
      // Voice submission: transcribe audio
      const transcription = await transcribeAudio(audioUrl);
      
      if (!transcription) {
        return NextResponse.json({ ok: false, error: "TRANSCRIPTION_FAILED" }, { status: 400 });
      }
      finalQuestion = transcription;
      inputMethod = 'voice';
    } else if (question) {
      // Text submission: use question directly
      finalQuestion = question;
      inputMethod = 'text';
    } else {
      return NextResponse.json({ ok: false, error: "Either audioUrl or question is required" }, { status: 400 });
    }

    // Query tutor using the server action
    const result = await askTutor({
      question: finalQuestion,
      lessonId,
      courseId,
      inputMethod
    });

    if (!result.ok) {
      const status = result.error === 'RATE_LIMITED' ? 429 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("[API_POST_RAG_TUTOR_QUERY_ERROR]", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "INTERNAL_SERVER_ERROR" 
    }, { status: 500 });
  }
}
