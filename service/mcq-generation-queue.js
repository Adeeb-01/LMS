import { dbConnect } from "@/service/mongo";
import { GenerationJob } from "@/model/generation-job.model";
import { Question } from "@/model/questionv2-model";
import { LectureDocument } from "@/model/lecture-document.model";
import { getChunksByLesson, isAvailable as isChromaAvailable } from "@/service/chroma";
import { chunkByHeadings } from "@/lib/embeddings/chunker";
import { generateQuestionsFromChunk } from "@/lib/mcq-generation/generator";
import { detectDuplicate } from "@/lib/mcq-generation/duplicate-detector";
import { pipelineOrchestrator } from "@/service/pipeline-orchestrator";

const MAX_CONCURRENT_JOBS = 5;
const MAX_RETRIES = 3;

/**
 * Fetches indexed chunks from ChromaDB for a given lesson.
 * Fallback to manual chunking from MongoDB if ChromaDB is unavailable.
 * @param {string} lessonId - The lesson ID to fetch chunks for.
 * @returns {Promise<Array>} - List of chunks with text and metadata.
 */
export async function getLessonChunks(lessonId) {
  try {
    // 1. Try to fetch from ChromaDB first
    const chunks = await getChunksByLesson(lessonId);
    if (chunks && chunks.length > 0) {
      return chunks;
    }
  } catch (err) {
    console.warn(`[MCQGenerationQueue] ChromaDB access error for lesson ${lessonId}:`, err.message);
  }

  // 2. Fallback: Reconstruct chunks from MongoDB if ChromaDB is down or empty
  console.info(`[MCQGenerationQueue] ChromaDB chunks not found for lesson ${lessonId}. Attempting MongoDB reconstruction.`);
  
  await dbConnect();
  const doc = await LectureDocument.findOne({ lessonId });
  if (!doc || !doc.extractedText || !doc.extractedText.structuredContent) {
    console.warn(`[MCQGenerationQueue] No content found in MongoDB for lesson ${lessonId}`);
    return [];
  }

  const semanticChunks = chunkByHeadings(doc.extractedText.structuredContent);
  
  if (!semanticChunks || semanticChunks.length === 0) {
    console.warn(`[MCQGenerationQueue] Chunking produced no segments for lesson ${lessonId}`);
    return [];
  }

  console.info(`[MCQGenerationQueue] Successfully reconstructed ${semanticChunks.length} chunks from MongoDB`);

  // Transform to the same format as ChromaDB output
  return semanticChunks.map(chunk => ({
    id: `embed-${doc.courseId}-${doc._id}-${chunk.chunkIndex}`,
    document: chunk.content,
    metadata: {
      type: 'semantic_chunk',
      courseId: doc.courseId.toString(),
      lessonId: doc.lessonId.toString(),
      lectureDocumentId: doc._id.toString(),
      headingPath: chunk.headingPath,
      chunkIndex: chunk.chunkIndex
    }
  }));
}

/**
 * Processes a single MCQ generation job.
 * @param {string} jobId - The ID of the job to process
 */
export async function processGenerationJob(jobId) {
  await dbConnect();
  
  let job = await GenerationJob.findById(jobId);
  if (!job || job.status === 'cancelled') return;

  try {
    // 1. Mark as processing and update startedAt
    await GenerationJob.findByIdAndUpdate(jobId, { 
      status: 'processing',
      startedAt: new Date()
    });

    // 2. Fetch chunks from ChromaDB
    const chunks = await getLessonChunks(job.lessonId);
    if (!chunks || chunks.length === 0) {
      throw new Error('No indexed content found for this lesson. Please index the document first.');
    }

    await GenerationJob.findByIdAndUpdate(jobId, { chunksTotal: chunks.length });

    // 2.5 Merge short chunks (< 50 words) with identical heading context
    const mergedChunks = [];
    let currentChunk = null;

    for (const chunk of chunks) {
      const wordCount = chunk.document.trim().split(/\s+/).length;
      
      if (!currentChunk) {
        currentChunk = { ...chunk, wordCount };
        continue;
      }

      const sameHeading = currentChunk.metadata.headingPath === chunk.metadata.headingPath;
      
      if (currentChunk.wordCount < 50 && sameHeading) {
        // Merge with current
        currentChunk.document += "\n\n" + chunk.document;
        currentChunk.wordCount += wordCount;
        // Keep the original ID of the first chunk or create a merged ID
        currentChunk.id = `${currentChunk.id}_merged_${chunk.id}`;
      } else {
        mergedChunks.push(currentChunk);
        currentChunk = { ...chunk, wordCount };
      }
    }
    if (currentChunk) mergedChunks.push(currentChunk);

    await GenerationJob.findByIdAndUpdate(jobId, { chunksTotal: mergedChunks.length });

    let processedCount = 0;
    let questionsGeneratedCount = 0;
    let questionsFlaggedCount = 0;

    // Fetch existing questions for duplicate detection
    const existingQuestions = await Question.find({ quizId: job.quizId }).lean();

    for (const chunk of mergedChunks) {
      // Re-check cancellation before each chunk
      job = await GenerationJob.findById(jobId);
      if (job.status === 'cancelled') return;

      try {
        const result = await generateQuestionsFromChunk(
          chunk.document, 
          { headingPath: chunk.metadata.headingPath }
        );

        if (!result.skipped && result.questions && result.questions.length > 0) {
          // Save generated questions to MongoDB
          const questionsToCreate = [];
          
          for (const q of result.questions) {
            const duplicateMatch = detectDuplicate(q, existingQuestions);
            
            const questionData = {
              quizId: job.quizId,
              type: q.options.length > 1 ? 'single' : 'oral',
              text: q.text,
              options: q.options.map(opt => ({ id: opt.id, text: opt.text })),
              correctOptionIds: [q.correctOptionId],
              explanation: q.explanation,
              points: 1,
              order: questionsGeneratedCount + questionsToCreate.length,
              isDraft: true,
              generatedBy: 'gemini',
              sourceChunkId: chunk.id,
              difficultyReasoning: q.difficulty.reasoning,
              bloomLevel: q.difficulty.bloomLevel,
              generationJobId: job._id,
              irt: {
                a: 1.0,
                b: q.difficulty.bValue,
                c: 0.0
              }
            };

            if (duplicateMatch) {
              questionData.duplicateOf = duplicateMatch.question._id;
              questionsFlaggedCount++;
            }

            questionsToCreate.push(questionData);
          }

          if (questionsToCreate.length > 0) {
            const created = await Question.insertMany(questionsToCreate);
            // Add new questions to existing pool for detecting duplicates within same job
            existingQuestions.push(...created);
            questionsGeneratedCount += questionsToCreate.length;
          }
        }

        processedCount++;
        await GenerationJob.findByIdAndUpdate(jobId, { 
          chunksProcessed: processedCount,
          questionsGenerated: questionsGeneratedCount,
          questionsFlagged: questionsFlaggedCount
        });

        // Add a small delay between chunks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (chunkError) {
        console.error(`[MCQGenerationQueue] Error processing chunk ${chunk.id}:`, chunkError);
        await GenerationJob.findByIdAndUpdate(jobId, {
          $push: {
            chunkErrors: {
              chunkId: chunk.id,
              error: chunkError.message,
              timestamp: new Date()
            }
          }
        });
        // Continue with next chunk
        processedCount++;
        await GenerationJob.findByIdAndUpdate(jobId, { chunksProcessed: processedCount });
      }
    }

    // 4. Mark as completed
    await GenerationJob.findByIdAndUpdate(jobId, { 
      status: 'completed',
      completedAt: new Date()
    });

    // 5. Notify Pipeline Orchestrator if part of a pipeline
    if (job.pipelineJobId) {
      await pipelineOrchestrator.handleStageCompletion(job.pipelineJobId, 'mcqGeneration', {
        questionsGenerated: questionsGeneratedCount,
        questionsFlagged: questionsFlaggedCount
      });
    }

  } catch (error) {
    console.error(`[MCQGenerationQueue] Error processing job ${jobId}:`, error);
    
    const retryCount = (job.retryCount || 0) + 1;
    const shouldRetry = retryCount < MAX_RETRIES;

    await GenerationJob.findByIdAndUpdate(jobId, { 
      status: shouldRetry ? 'pending' : 'failed',
      errorMessage: error.message,
      retryCount
    });
  }
}

/**
 * Triggers an MCQ generation job.
 * @param {Object} data - { lessonId, courseId, quizId, lectureDocumentId, triggeredBy, pipelineJobId }
 */
export async function triggerGeneration(data) {
  await dbConnect();

  // Cancel any existing pending or processing jobs for this lesson
  await GenerationJob.updateMany(
    { lessonId: data.lessonId, status: { $in: ['pending', 'processing'] } },
    { status: 'cancelled' }
  );

  const job = await GenerationJob.create({
    ...data,
    status: 'pending'
  });

  // Background execution with concurrency control
  scheduleNextJob();

  return { success: true, jobId: job._id.toString() };
}

/**
 * Checks concurrency limits and schedules the next job if possible.
 */
async function scheduleNextJob() {
  const activeJobs = await GenerationJob.countDocuments({ status: 'processing' });
  if (activeJobs >= MAX_CONCURRENT_JOBS) return;

  const nextJob = await GenerationJob.findOneAndUpdate(
    { status: 'pending' },
    { status: 'processing' }, // Reserve it
    { sort: { createdAt: 1 }, new: true }
  );

  if (nextJob) {
    processGenerationJob(nextJob._id).then(() => {
      scheduleNextJob();
    }).catch(() => {
      scheduleNextJob();
    });
  }
}
