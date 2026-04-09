import { dbConnect } from "@/service/mongo";
import { OralGenerationJob } from "@/model/oral-generation-job.model";
import { Question } from "@/model/questionv2-model";
import { getLessonChunks } from "@/service/mcq-generation-queue";
import { generateOralQuestions } from "@/lib/oral-generation/generator";
import { isDuplicateOral } from "@/lib/oral-generation/duplicate-detector";
import { pipelineOrchestrator } from "@/service/pipeline-orchestrator";

const MAX_CONCURRENT_JOBS = 5;
const MAX_RETRIES = 3;

/**
 * Processes a single Oral generation job.
 * @param {string} jobId - The ID of the job to process
 */
export async function processOralGenerationJob(jobId) {
  await dbConnect();
  
  let job = await OralGenerationJob.findById(jobId);
  if (!job || job.status === 'cancelled') return;

  try {
    // 1. Mark as processing and update startedAt
    await OralGenerationJob.findByIdAndUpdate(jobId, { 
      status: 'processing',
      startedAt: new Date()
    });

    // 2. Fetch chunks (reusing MCQ logic)
    const chunks = await getLessonChunks(job.lessonId);
    if (!chunks || chunks.length === 0) {
      throw new Error('No indexed content found for this lesson. Please index the document first.');
    }

    await OralGenerationJob.findByIdAndUpdate(jobId, { chunksTotal: chunks.length });

    let processedCount = 0;
    let skippedCount = 0;
    let questionsGeneratedCount = 0;
    let questionsFlaggedCount = 0;

    // Fetch existing oral questions for duplicate detection
    const existingQuestions = await Question.find({ quizId: job.quizId, type: 'oral' }).lean();

    for (const chunk of chunks) {
      // Re-check cancellation before each chunk
      job = await OralGenerationJob.findById(jobId);
      if (job.status === 'cancelled') return;

      const wordCount = chunk.document.trim().split(/\s+/).length;
      
      // T022: Add 100-word minimum content filter
      if (wordCount < 100) {
        skippedCount++;
        processedCount++;
        await OralGenerationJob.findByIdAndUpdate(jobId, { 
          chunksProcessed: processedCount,
          chunksSkipped: skippedCount 
        });
        continue;
      }

      try {
        // T023: Cognitive levels application/analysis/synthesis/evaluation
        // Cycle through cognitive levels or choose based on some logic. 
        // For now, let's use analysis as default as per spec notes.
        const levels = ['application', 'analysis', 'synthesis', 'evaluation'];
        const targetLevel = levels[questionsGeneratedCount % levels.length];

        const questions = await generateOralQuestions({
          content: chunk.document, 
          cognitiveLevel: targetLevel,
          context: { headingPath: chunk.metadata.headingPath }
        });

        if (questions && questions.length > 0) {
          const questionsToCreate = [];
          
          for (const q of questions) {
            const isDuplicate = await isDuplicateOral(q, existingQuestions);
            
            const questionData = {
              quizId: job.quizId,
              type: 'oral',
              text: q.text,
              referenceAnswer: q.referenceAnswer,
              points: 2, // Oral questions usually worth more
              order: questionsGeneratedCount + questionsToCreate.length,
              isDraft: true,
              generatedBy: 'gemini',
              sourceChunkId: chunk.id,
              difficultyReasoning: q.difficulty.reasoning,
              cognitiveLevel: q.cognitiveLevel,
              oralGenerationJobId: job._id,
              irt: {
                a: 1.0,
                b: q.difficulty.bValue,
                c: 0.0
              }
            };

            if (isDuplicate) {
              // Flag duplicate by referencing it if possible, or just mark it
              // Question schema has duplicateOf field
              // For simplicity, we just mark it as flagged in the job status
              questionsFlaggedCount++;
            }

            questionsToCreate.push(questionData);
          }

          if (questionsToCreate.length > 0) {
            const created = await Question.insertMany(questionsToCreate);
            existingQuestions.push(...created);
            questionsGeneratedCount += questionsToCreate.length;
          }
        }

        processedCount++;
        await OralGenerationJob.findByIdAndUpdate(jobId, { 
          chunksProcessed: processedCount,
          questionsGenerated: questionsGeneratedCount,
          questionsFlagged: questionsFlaggedCount
        });

        // Add delay between chunks
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (chunkError) {
        console.error(`[OralGenerationQueue] Error processing chunk ${chunk.id}:`, chunkError);
        await OralGenerationJob.findByIdAndUpdate(jobId, {
          $push: {
            chunkErrors: {
              chunkId: chunk.id,
              error: chunkError.message,
              timestamp: new Date()
            }
          }
        });
        processedCount++;
        await OralGenerationJob.findByIdAndUpdate(jobId, { chunksProcessed: processedCount });
      }
    }

    // Mark as completed
    await OralGenerationJob.findByIdAndUpdate(jobId, { 
      status: 'completed',
      completedAt: new Date()
    });

    // 5. Notify Pipeline Orchestrator if part of a pipeline
    if (job.pipelineJobId) {
      await pipelineOrchestrator.handleStageCompletion(job.pipelineJobId, 'oralGeneration', {
        questionsGenerated: questionsGeneratedCount,
        questionsFlagged: questionsFlaggedCount
      });
    }

  } catch (error) {
    console.error(`[OralGenerationQueue] Error processing job ${jobId}:`, error);
    
    const retryCount = (job.retryCount || 0) + 1;
    const shouldRetry = retryCount < MAX_RETRIES;

    await OralGenerationJob.findByIdAndUpdate(jobId, { 
      status: shouldRetry ? 'pending' : 'failed',
      errorMessage: error.message,
      retryCount
    });
  }
}

/**
 * Triggers an Oral generation job.
 * @param {Object} data - { lessonId, courseId, quizId, lectureDocumentId, triggeredBy }
 */
export async function triggerOralGeneration(data) {
  await dbConnect();

  // Cancel any existing pending or processing jobs for this lesson
  await OralGenerationJob.updateMany(
    { lessonId: data.lessonId, status: { $in: ['pending', 'processing'] } },
    { status: 'cancelled' }
  );

  const job = await OralGenerationJob.create({
    ...data,
    status: 'pending'
  });

  scheduleNextOralJob();

  return { success: true, jobId: job._id.toString() };
}

/**
 * Checks concurrency limits and schedules the next job if possible.
 */
async function scheduleNextOralJob() {
  const activeJobs = await OralGenerationJob.countDocuments({ status: 'processing' });
  if (activeJobs >= MAX_CONCURRENT_JOBS) return;

  const nextJob = await OralGenerationJob.findOneAndUpdate(
    { status: 'pending' },
    { status: 'processing' }, 
    { sort: { createdAt: 1 }, new: true }
  );

  if (nextJob) {
    processOralGenerationJob(nextJob._id).then(() => {
      scheduleNextOralJob();
    }).catch(() => {
      scheduleNextOralJob();
    });
  }
}
