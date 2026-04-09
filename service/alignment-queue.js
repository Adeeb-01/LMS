import { dbConnect } from "@/service/mongo";
import { AlignmentJob } from "@/model/alignment-job.model";
import { processAlignmentJob } from "@/lib/alignment/job-processor";

/**
 * Adds a new alignment job to the queue.
 */
export async function queueAlignmentJob({ lessonId, courseId, lectureDocumentId, triggeredBy, pipelineJobId }) {
  await dbConnect();

  // Check for existing active job for this lesson
  const existingJob = await AlignmentJob.findOne({ 
    lessonId, 
    status: { $in: ['queued', 'processing'] } 
  });

  if (existingJob) {
    return { success: false, message: 'Alignment job already in progress', jobId: existingJob._id.toString() };
  }

  const job = await AlignmentJob.create({
    lessonId,
    courseId,
    lectureDocumentId,
    status: 'queued',
    triggeredBy,
    pipelineJobId,
    scheduledFor: new Date() // Process immediately
  });

  // Start processing in the background (non-blocking)
  // In a real production app, we would use a dedicated worker (e.g., BullMQ)
  // For this LMS, we'll use a simple background execution
  processAlignmentJob(job._id).catch(err => {
    console.error(`[Queue] Failed to start job ${job._id}:`, err);
  });

  return { success: true, jobId: job._id.toString() };
}

/**
 * Polls for and processes pending jobs.
 * This can be called from a cron job or a background loop.
 */
export async function pollAndProcessJobs() {
  await dbConnect();

  const pendingJob = await AlignmentJob.findOneAndUpdate(
    { 
      status: 'queued', 
      scheduledFor: { $lte: new Date() } 
    },
    { 
      status: 'processing',
      startedAt: new Date(),
      phase: 'audio-extraction',
      progress: 0
    },
    { sort: { scheduledFor: 1 }, new: true }
  );

  if (pendingJob) {
    console.log(`[Queue] Processing job: ${pendingJob._id}`);
    await processAlignmentJob(pendingJob._id);
    return true; // Processed one job
  }

  return false; // No jobs to process
}
