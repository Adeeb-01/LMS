"use server";

import { auth } from "@/auth";
import { dbConnect } from "@/service/mongo";
import { OralGenerationJob } from "@/model/oral-generation-job.model";
import { Question } from "@/model/questionv2-model";
import { Quiz } from "@/model/quizv2-model";
import { LectureDocument } from "@/model/lecture-document.model";
import { 
  triggerOralGeneration as triggerQueueGeneration,
  processOralGenerationJob
} from "@/service/oral-generation-queue";
import { getLessonChunks } from "@/service/mcq-generation-queue";
import { assertInstructorOwnsLesson } from "@/lib/authorization";
import { triggerOralGenerationSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { generateOralQuestions } from "@/lib/oral-generation/generator";
import { isDuplicateOral } from "@/lib/oral-generation/duplicate-detector";

/**
 * Triggers Oral question generation for a lesson.
 */
export async function triggerOralGeneration(lessonId, quizId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();

    // 1. Authorization check: T025 Add course owner authorization check
    const { lesson, course } = await assertInstructorOwnsLesson(lessonId, session.user.id, session.user);
    const courseId = course?._id || lesson.courseId;

    // 2. Validate input
    triggerOralGenerationSchema.parse({ lessonId });

    // 3. Ensure quiz exists
    let targetQuizId = quizId;
    if (!targetQuizId) {
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
    const existingJob = await OralGenerationJob.findOne({
      lessonId,
      status: { $in: ['pending', 'processing'] }
    });
    if (existingJob) {
      return { ok: false, error: "Oral generation already in progress for this lesson." };
    }

    // 6. Trigger background job
    const result = await triggerQueueGeneration({
      lessonId,
      courseId,
      quizId: targetQuizId,
      lectureDocumentId: doc._id,
      triggeredBy: session.user.id
    });

    return { ok: true, jobId: result.jobId };
  } catch (error) {
    console.error("[TRIGGER_ORAL_GENERATION_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * Gets the status of an oral generation job.
 */
export async function getOralGenerationStatus(jobId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    const job = await OralGenerationJob.findById(jobId).lean();
    if (!job) {
      return { ok: false, error: "Job not found" };
    }

    // Authorization
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
          chunksSkipped: job.chunksSkipped,
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
    console.error("[GET_ORAL_STATUS_ERROR]", error);
    return { ok: false, error: error.message };
  }
}

/**
 * T025a: Regenerates oral questions for a specific chunk.
 */
export async function regenerateOralQuestionForChunk(lessonId, quizId, sourceChunkId) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    await dbConnect();
    
    // Authorization
    await assertInstructorOwnsLesson(lessonId, session.user.id, session.user);

    // Fetch chunk
    const chunks = await getLessonChunks(lessonId);
    const chunk = chunks.find(c => c.id === sourceChunkId);
    if (!chunk) throw new Error("Source chunk not found");

    // Generate
    const questions = await generateOralQuestions({
      content: chunk.document,
      cognitiveLevel: 'analysis',
      context: { headingPath: chunk.metadata.headingPath }
    });

    if (!questions || questions.length === 0) {
      return { ok: false, error: "No question generated for this chunk (content may be insufficient)." };
    }

    // Duplicate check
    const existingQuestions = await Question.find({ quizId, type: 'oral' }).lean();
    
    const questionsToCreate = [];
    for (const q of questions) {
      const isDuplicate = await isDuplicateOral(q, existingQuestions);
      
      questionsToCreate.push({
        quizId,
        type: 'oral',
        text: q.text,
        referenceAnswer: q.referenceAnswer,
        points: 2,
        order: existingQuestions.length + questionsToCreate.length,
        isDraft: true,
        generatedBy: 'gemini',
        sourceChunkId,
        difficultyReasoning: q.difficulty.reasoning,
        cognitiveLevel: q.cognitiveLevel,
        duplicateOf: isDuplicate ? existingQuestions[0]._id : null, // Simplified duplicate reference
        irt: {
          a: 1.0,
          b: q.difficulty.bValue,
          c: 0.0
        }
      });
    }

    if (questionsToCreate.length > 0) {
      await Question.insertMany(questionsToCreate);
    }

    revalidatePath(`/dashboard/courses/[courseId]/lessons/[lessonId]/generate-questions`, 'page');
    return { ok: true, count: questionsToCreate.length };
  } catch (error) {
    console.error("[REGENERATE_ORAL_CHUNK_ERROR]", error);
    return { ok: false, error: error.message };
  }
}
