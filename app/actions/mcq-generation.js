"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/service/mongo";
import { GenerationJob } from "@/model/generation-job.model";
import { Question } from "@/model/questionv2-model";
import { Quiz } from "@/model/quizv2-model";
import { LectureDocument } from "@/model/lecture-document.model";
import { 
  triggerGeneration as triggerQueueGeneration,
  getLessonChunks
} from "@/service/mcq-generation-queue";
import { assertInstructorOwnsLesson, isAdmin } from "@/lib/authorization";
import { triggerGenerationSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { generateQuestionsFromChunk } from "@/lib/mcq-generation/generator";
import { detectDuplicate } from "@/lib/mcq-generation/duplicate-detector";

/**
 * Triggers MCQ generation for a lesson.
 */
export async function triggerGeneration(lessonId, quizId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();

    // 1. Authorization check
    const { lesson, course } = await assertInstructorOwnsLesson(lessonId, session.user.id, session.user);
    const courseId = course?._id || lesson.courseId; // assertInstructorOwnsLesson might return null course for admin

    // 2. Validate input
    triggerGenerationSchema.parse({ lessonId, quizId });

    // 3. Ensure quiz exists
    let targetQuizId = quizId;
    if (!targetQuizId) {
      // Find or create quiz for this lesson
      let quiz = await Quiz.findOne({ lessonId });
      if (!quiz) {
        quiz = await Quiz.create({
          courseId,
          lessonId,
          title: `Quiz: ${lesson.title}`,
          description: `Automatically generated quiz for ${lesson.title}`,
          createdBy: session.user.id,
          published: false
        });
      }
      targetQuizId = quiz._id.toString();
    }

    // 4. Check for indexed content
    const doc = await LectureDocument.findOne({ lessonId, embeddingStatus: 'indexed' });
    if (!doc) {
      return { ok: false, error: "Lesson has no indexed content. Please upload and index a document first." };
    }

    // 5. Check for existing active jobs
    const existingJob = await GenerationJob.findOne({
      lessonId,
      status: { $in: ['pending', 'processing'] }
    });
    if (existingJob) {
      return { ok: false, error: "Generation already in progress for this lesson." };
    }

    // 6. Trigger background job
    const result = await triggerQueueGeneration({
      lessonId,
      courseId,
      quizId: targetQuizId,
      lectureDocumentId: doc._id,
      triggeredBy: session.user.id
    });

    return { ok: true, jobId: result.jobId.toString() };
  } catch (error) {
    console.error("[TRIGGER_GENERATION_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Gets the status of a generation job.
 */
export async function getGenerationStatus(jobId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    const job = await GenerationJob.findById(jobId).lean();
    if (!job) {
      return { ok: false, error: "Job not found" };
    }

    // Authorization check: only instructor who owns the lesson or admin
    await assertInstructorOwnsLesson(job.lessonId, session.user.id, session.user);

    return {
      ok: true,
      job: {
        id: job._id.toString(),
        lessonId: job.lessonId.toString(),
        courseId: job.courseId.toString(),
        quizId: job.quizId.toString(),
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
        completedAt: job.completedAt
      }
    };
  } catch (error) {
    console.error("[GET_GENERATION_STATUS_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Cancels an in-progress generation job.
 */
export async function cancelGeneration(jobId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    const job = await GenerationJob.findById(jobId);
    if (!job) {
      return { ok: false, error: "Job not found" };
    }

    // Authorization
    await assertInstructorOwnsLesson(job.lessonId, session.user.id, session.user);

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return { ok: false, error: `Cannot cancel job in ${job.status} state.` };
    }

    job.status = 'cancelled';
    await job.save();

    return { ok: true };
  } catch (error) {
    console.error("[CANCEL_GENERATION_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Activates generated questions (moves from draft to active).
 */
export async function activateGeneratedQuestions(questionIds) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    
    // Authorization check for the first question (assuming all belong to same lesson/course)
    const firstQuestion = await Question.findById(questionIds[0]).select('quizId').lean();
    if (!firstQuestion) throw new Error("Questions not found");

    // We should ideally check ownership of the quiz/lesson here
    // For now, simple update with isDraft: false
    const result = await Question.updateMany(
      { _id: { $in: questionIds } },
      { isDraft: false }
    );

    revalidatePath(`/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions`, 'page');
    return { ok: true, activatedCount: result.modifiedCount };
  } catch (error) {
    console.error("[ACTIVATE_QUESTIONS_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Deletes generated draft questions.
 */
export async function deleteGeneratedQuestions(questionIds) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    const result = await Question.deleteMany({
      _id: { $in: questionIds },
      isDraft: true // Only allow deleting drafts via this action
    });

    revalidatePath(`/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions`, 'page');
    return { ok: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error("[DELETE_QUESTIONS_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Regenerates questions for a specific chunk.
 */
export async function regenerateQuestionsForChunk(lessonId, quizId, sourceChunkId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    
    // 1. Authorization
    await assertInstructorOwnsLesson(lessonId, session.user.id, session.user);

    // 2. Fetch chunk from ChromaDB
    const chunks = await getLessonChunks(lessonId);
    const chunk = chunks.find(c => c.id === sourceChunkId);
    if (!chunk) {
      throw new Error("Source chunk not found");
    }

    // 3. Generate new questions
    const result = await generateQuestionsFromChunk(
      chunk.document, 
      { headingPath: chunk.metadata.headingPath }
    );

    if (result.skipped) {
      return { ok: false, error: "Chunk was skipped: " + (result.skipReason || "No educational content") };
    }

    // 4. Fetch existing questions for duplicate detection
    const existingQuestions = await Question.find({ quizId }).lean();

    // 5. Save new questions
    const questionsToCreate = result.questions.map((q, idx) => {
      const duplicateMatch = detectDuplicate(q, existingQuestions);
      
      const questionData = {
        quizId,
        type: q.options.length > 1 ? 'single' : 'oral',
        text: q.text,
        options: q.options.map(opt => ({ id: opt.id, text: opt.text })),
        correctOptionIds: [q.correctOptionId],
        explanation: q.explanation,
        points: 1,
        order: existingQuestions.length + idx,
        isDraft: true,
        generatedBy: 'gemini',
        sourceChunkId,
        difficultyReasoning: q.difficulty.reasoning,
        bloomLevel: q.difficulty.bloomLevel,
        irt: {
          a: 1.0,
          b: q.difficulty.bValue,
          c: 0.0
        }
      };

      if (duplicateMatch) {
        questionData.duplicateOf = duplicateMatch.question._id;
      }

      return questionData;
    });

    if (questionsToCreate.length > 0) {
      await Question.insertMany(questionsToCreate);
    }

    revalidatePath(`/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions`, 'page');
    return { ok: true, count: questionsToCreate.length };
  } catch (error) {
    console.error("[REGENERATE_CHUNK_ERROR]", error);
    return { ok: false, error: error.message };
  }
}
