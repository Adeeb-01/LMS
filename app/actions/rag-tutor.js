"use server"

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { searchCourse } from "@/service/semantic-search";
import { generateGroundedResponse } from "@/lib/rag/tutor-response";
import { TutorInteraction } from "@/model/tutor-interaction.model";
import { ReciteBackAttempt } from "@/model/recite-back-attempt.model";
import { ConceptGap } from "@/model/concept-gap.model";
import { computeSemanticSimilarity } from "@/lib/ai/semantic-similarity";
import { ragTutorQuerySchema, reciteBackSubmissionSchema } from "@/lib/validations";
import { getTranslations } from "next-intl/server";
import { ERROR_CODES } from "@/lib/errors";
import mongoose from "mongoose";

/**
 * Server Action for student-initiated RAG tutor questions.
 * 
 * @param {object} data - { question, lessonId, courseId, inputMethod }
 * @returns {Promise<object>}
 */
export async function askTutor(data) {
  await dbConnect();
  const t = await getTranslations("RagTutor");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    // 1. Validate Input
    const validated = ragTutorQuerySchema.safeParse(data);
    if (!validated.success) {
      return { 
        ok: false, 
        error: "VALIDATION_ERROR", 
        details: validated.error.errors 
      };
    }

    const { question, lessonId, courseId, inputMethod } = validated.data;

    // 2. Rate Limiting (Soft limit: 10 questions per lesson per user)
    const questionCount = await TutorInteraction.countDocuments({
      userId: user.id,
      lessonId: lessonId,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    if (questionCount >= 10) {
      return { 
        ok: false, 
        error: "RATE_LIMITED",
        message: t('rateLimitExceeded') || "You have reached the daily limit for tutor questions in this lesson."
      };
    }

    // 3. Search Course Content (RAG)
    // We use the existing searchCourse service which already handles enrollment verification
    const searchResults = await searchCourse(question, courseId, user, { limit: 3, threshold: 0.6 });
    
    // 4. Generate Grounded Response
    const { response, isGrounded, timestampLinks } = await generateGroundedResponse(
      question, 
      searchResults.results
    );

    // 5. Persist Interaction
    const interaction = await TutorInteraction.create({
      userId: user.id,
      lessonId: lessonId,
      courseId: courseId,
      question: question,
      questionInputMethod: inputMethod,
      response: response,
      isGrounded: isGrounded,
      retrievedChunks: searchResults.results.map(res => ({
        chunkId: res.chunkId,
        content: res.text.substring(0, 500),
        similarity: res.score
      })),
      timestampLinks: timestampLinks,
      reciteBackRequired: isGrounded // Trigger recite-back if response is grounded
    });

    return {
      ok: true,
      result: {
        interactionId: interaction._id.toString(),
        question: question,
        response: response,
        isGrounded: isGrounded,
        timestampLinks: timestampLinks,
        reciteBackRequired: interaction.reciteBackRequired,
        rateLimitWarning: questionCount >= 8 ? t('rateLimitWarning') : null
      }
    };

  } catch (error) {
    console.error("[ASK_TUTOR_ACTION_ERROR]", error);
    return {
      ok: false,
      error: error.message || "INTERNAL_SERVER_ERROR"
    };
  }
}

/**
 * Submit a recite-back attempt for evaluation.
 * Auth: Verify student owns the interaction.
 */
export async function submitReciteBack(data) {
  await dbConnect();
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const parsed = reciteBackSubmissionSchema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: "VALIDATION_ERROR", details: parsed.error.errors };
    }

    const { interactionId, lessonId, recitation, inputMethod, attemptNumber } = parsed.data;

    // Get interaction details
    const interaction = await TutorInteraction.findById(interactionId).lean();
    if (!interaction) {
      return { ok: false, error: "Interaction not found" };
    }

    // Verify ownership
    if (interaction.userId.toString() !== user.id) {
      return { ok: false, error: "FORBIDDEN" };
    }

    // 1. Compute semantic similarity against the tutor's response
    const similarityScore = await computeSemanticSimilarity(recitation, interaction.response);

    // 2. Determine if passed (threshold: 0.5 for recite-back)
    const PASS_THRESHOLD = 0.5;
    const passed = similarityScore >= PASS_THRESHOLD;

    // 3. Save attempt
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

    // 4. Log concept gap if failed and max attempts reached
    const MAX_ATTEMPTS = 3;
    const CONCEPT_MAX_LENGTH = 500;
    if (!passed && attemptNumber >= MAX_ATTEMPTS) {
      // Truncate the response to fit within the concept field's maxlength
      const conceptText = interaction.response.length > CONCEPT_MAX_LENGTH 
        ? interaction.response.substring(0, CONCEPT_MAX_LENGTH - 3) + "..."
        : interaction.response;
      
      await ConceptGap.findOneAndUpdate(
        {
          userId: new mongoose.Types.ObjectId(user.id),
          lessonId: new mongoose.Types.ObjectId(lessonId),
          concept: conceptText
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

    return {
      ok: true,
      result: {
        id: attempt._id.toString(),
        similarityScore,
        passed,
        feedback: passed ? "Great recall! You've captured the key points." : "Not quite. Try to explain it in your own words again."
      }
    };
  } catch (error) {
    console.error("[SUBMIT_RECITE_BACK_ERROR]", error);
    return { ok: false, error: error.message || "INTERNAL_SERVER_ERROR" };
  }
}
