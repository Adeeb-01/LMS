import { dbConnect } from "@/service/mongo";
import { IndexingJob } from "@/model/indexing-job.model";
import { LectureDocument } from "@/model/lecture-document.model";
import { generateBatchEmbeddings } from "@/lib/embeddings/gemini";
import { chunkByHeadings } from "@/lib/embeddings/chunker";
import { addEmbeddings, removeEmbeddingsByDocument } from "@/service/chroma";
import { pipelineOrchestrator } from "@/service/pipeline-orchestrator";

const MAX_CONCURRENT_JOBS = 5;
const MAX_RETRIES = 3;

/**
 * Processes a single indexing job.
 * @param {string} jobId - The ID of the job to process
 */
export async function processIndexingJob(jobId) {
  await dbConnect();
  
  let job = await IndexingJob.findById(jobId);
  if (!job || job.status === 'cancelled') return;

  try {
    // 1. Mark as processing and update startedAt
    await IndexingJob.findByIdAndUpdate(jobId, { 
      status: 'processing',
      startedAt: new Date()
    });

    const doc = await LectureDocument.findById(job.lectureDocumentId);
    if (!doc) throw new Error('Lecture document not found');

    // Update LectureDocument status
    await LectureDocument.findByIdAndUpdate(job.lectureDocumentId, { 
      embeddingStatus: 'processing',
      embeddingJobId: jobId
    });

    // 2. Chunk document
    const chunks = chunkByHeadings(doc.extractedText.structuredContent);
    await IndexingJob.findByIdAndUpdate(jobId, { chunksTotal: chunks.length });

    // 3. Generate embeddings in batches of 100 (Gemini limit)
    const BATCH_SIZE = 100;
    let processedCount = 0;

    // First, clear any existing embeddings for this document (re-indexing)
    await removeEmbeddingsByDocument(job.lectureDocumentId);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      // Re-check cancellation before each batch
      job = await IndexingJob.findById(jobId);
      if (job.status === 'cancelled') {
        // Clean up partial embeddings if needed, though removeEmbeddingsByDocument can do it later
        return;
      }

      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.content);
      
      const embeddings = await generateBatchEmbeddings(texts);
      
      // Store in ChromaDB
      const chromaData = batch.map((chunk, idx) => ({
        id: `embed-${job.courseId}-${job.lectureDocumentId}-${chunk.chunkIndex}`,
        embedding: embeddings[idx],
        document: chunk.content,
        metadata: {
          type: 'semantic_chunk',
          courseId: job.courseId.toString(),
          lessonId: job.lessonId.toString(),
          lectureDocumentId: job.lectureDocumentId.toString(),
          headingPath: chunk.headingPath,
          chunkIndex: chunk.chunkIndex
        }
      }));

      await addEmbeddings(chromaData);

      processedCount += batch.length;
      await IndexingJob.findByIdAndUpdate(jobId, { chunksProcessed: processedCount });
    }

    // 4. Final updates
    await IndexingJob.findByIdAndUpdate(jobId, { 
      status: 'completed',
      completedAt: new Date()
    });

    await LectureDocument.findByIdAndUpdate(job.lectureDocumentId, { 
      embeddingStatus: 'indexed',
      chunksIndexed: processedCount,
      lastIndexedAt: new Date()
    });

    // 5. Notify Pipeline Orchestrator if part of a pipeline
    if (job.pipelineJobId) {
      await pipelineOrchestrator.handleStageCompletion(job.pipelineJobId, 'indexing', {
        chunksIndexed: processedCount
      });
    }

  } catch (error) {
    console.error(`[EmbeddingQueue] Error processing job ${jobId}:`, error);
    
    const retryCount = (job.retryCount || 0) + 1;
    const shouldRetry = retryCount < MAX_RETRIES;

    await IndexingJob.findByIdAndUpdate(jobId, { 
      status: shouldRetry ? 'pending' : 'failed',
      errorMessage: error.message,
      retryCount
    });

    if (!shouldRetry) {
      await LectureDocument.findByIdAndUpdate(job.lectureDocumentId, { 
        embeddingStatus: 'failed'
      });
    }
  }
}

/**
 * Triggers the indexing job for a lecture document.
 * @param {string} lectureDocumentId - The ID of the document to index
 * @param {string} pipelineJobId - Optional ID of the parent pipeline job
 */
export async function triggerIndexing(lectureDocumentId, pipelineJobId = null) {
  await dbConnect();

  const doc = await LectureDocument.findById(lectureDocumentId);
  if (!doc) return { success: false, error: 'Document not found' };

  // Cancel any existing pending or processing jobs for this document
  await IndexingJob.updateMany(
    { lectureDocumentId, status: { $in: ['pending', 'processing'] } },
    { status: 'cancelled' }
  );

  const job = await IndexingJob.create({
    lectureDocumentId,
    courseId: doc.courseId,
    lessonId: doc.lessonId,
    pipelineJobId,
    status: 'pending'
  });

  await LectureDocument.findByIdAndUpdate(lectureDocumentId, {
    embeddingStatus: 'pending',
    embeddingJobId: job._id
  });

  // Background execution with concurrency control
  scheduleNextJob();

  return { success: true, jobId: job._id.toString() };
}

/**
 * Checks concurrency limits and schedules the next job if possible.
 */
async function scheduleNextJob() {
  const activeJobs = await IndexingJob.countDocuments({ status: 'processing' });
  if (activeJobs >= MAX_CONCURRENT_JOBS) return;

  const nextJob = await IndexingJob.findOneAndUpdate(
    { status: 'pending' },
    { status: 'processing' }, // Reserve it
    { sort: { createdAt: 1 }, new: true }
  );

  if (nextJob) {
    processIndexingJob(nextJob._id).then(() => {
      scheduleNextJob(); // Try to schedule next once finished
    }).catch(() => {
      scheduleNextJob();
    });
  }
}
