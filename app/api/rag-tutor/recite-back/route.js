import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { TutorInteraction } from "@/model/tutor-interaction.model";
import { ReciteBackAttempt } from "@/model/recite-back-attempt.model";
import { ConceptGap } from "@/model/concept-gap.model";
import { computeSemanticSimilarity } from "@/lib/ai/semantic-similarity";
import { transcribeAudio } from "@/lib/ai/transcription";
import { reciteBackSubmissionSchema } from "@/lib/validations";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reciteBackSubmissionSchema.safeParse({
      ...body,
      // For API route, we expect audioUrl if inputMethod is voice
      // The schema requires recitation, so we'll provide a placeholder if voice
      recitation: body.inputMethod === "voice" ? "TRANSCRIPTION_PENDING" : body.recitation
    });

    if (!parsed.success) {
      return Response.json({ error: "Invalid submission data", details: parsed.error.errors }, { status: 400 });
    }

    const { interactionId, lessonId, inputMethod, attemptNumber } = parsed.data;
    let recitation = body.recitation;

    // Get interaction details
    const interaction = await TutorInteraction.findById(interactionId).lean();
    if (!interaction) {
      return Response.json({ error: "Interaction not found" }, { status: 404 });
    }

    // Verify ownership
    if (interaction.userId.toString() !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify enrollment
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");
    const isEnrolled = await hasEnrollmentForCourse(interaction.courseId.toString(), user.id);
    if (!isEnrolled && user.role !== 'admin' && user.role !== 'instructor') {
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Handle transcription if voice
    if (inputMethod === "voice") {
      if (!body.audioUrl) {
        return Response.json({ error: "Audio URL required for voice input" }, { status: 400 });
      }
      recitation = await transcribeAudio(body.audioUrl);
    }

    // 2. Compute semantic similarity against the tutor's response
    const similarityScore = await computeSemanticSimilarity(recitation, interaction.response);

    // 3. Determine if passed (threshold: 0.5 for recite-back)
    const PASS_THRESHOLD = 0.5;
    const passed = similarityScore >= PASS_THRESHOLD;

    // 4. Save attempt
    const attempt = await ReciteBackAttempt.create({
      interactionId: new mongoose.Types.ObjectId(interactionId),
      userId: new mongoose.Types.ObjectId(user.id),
      lessonId: new mongoose.Types.ObjectId(lessonId),
      originalExplanation: interaction.response,
      recitation,
      similarityScore,
      passed,
      attemptNumber,
      inputMethod
    });

    // 5. Log concept gap if failed and max attempts reached
    const MAX_ATTEMPTS = 3;
    if (!passed && attemptNumber >= MAX_ATTEMPTS) {
      await ConceptGap.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(user.id),
          lessonId: new mongoose.Types.ObjectId(lessonId),
          concept: interaction.response
        },
        {
          $set: {
            courseId: interaction.courseId,
            source: 'recite_back',
            sourceId: attempt._id,
            flaggedForReview: true
          },
          $inc: { failureCount: 1 }
        },
        { upsert: true, new: true }
      );
    }

    return Response.json({
      ok: true,
      result: {
        id: attempt._id.toString(),
        similarityScore,
        passed,
        feedback: passed ? "Great recall! You've captured the key points." : "Not quite. Try to explain it in your own words again."
      }
    });

  } catch (error) {
    console.error("[RECITE_BACK_API_ERROR]", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
