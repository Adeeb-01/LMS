import path from 'path';
import { dbConnect } from "@/service/mongo";
import { AlignmentJob } from "@/model/alignment-job.model";
import { VideoTranscript } from "@/model/video-transcript.model";
import { LectureDocument } from "@/model/lecture-document.model";
import { Lesson } from "@/model/lesson.model";
import { extractAudio, cleanupAudio } from "./audio-extractor";
import { transcribeAudio } from "./transcriber";
import { alignTextWithTranscript } from "./text-aligner";
import { alignmentConfig } from "./config";
import { pipelineOrchestrator } from "@/service/pipeline-orchestrator";

/**
 * Main background job processor for alignment.
 * @param {string} jobId - ID of the AlignmentJob to process
 */
export async function processAlignmentJob(jobId) {
  await dbConnect();

  let job = await AlignmentJob.findById(jobId);
  if (!job || job.status === 'completed') return;

  let audioPath = null;

  try {
    // 1. Update status to processing
    await updateJob(jobId, { 
      status: 'processing', 
      phase: 'audio-extraction', 
      progress: 5,
      startedAt: new Date() 
    });

    // 2. Get Lesson and Video Path
    const lesson = await Lesson.findById(job.lessonId);
    if (!lesson) {
      throw new Error(`Lesson ${job.lessonId} not found.`);
    }

    // T054: Handle edge case: skip alignment when lesson has no local video file
    if (!lesson.videoFilename) {
      console.info(`[JobProcessor] Lesson ${job.lessonId} has no local video file. Skipping alignment.`);
      await updateJob(jobId, { 
        status: 'completed', 
        phase: 'saving', 
        progress: 100,
        completedAt: new Date(),
        errorMessage: 'Skipped: No local video file'
      });
      
      if (job.pipelineJobId) {
        await pipelineOrchestrator.handleStageCompletion(job.pipelineJobId, 'alignment', {
          skipped: true
        });
      }
      return;
    }

    // Determine video path - relative to project root
    const videoPath = path.join(process.cwd(), 'uploads', 'videos', lesson.videoFilename);
    
    // 3. Extract Audio
    audioPath = await extractAudio(videoPath);
    
    // T054: Handle edge case: skip alignment when video has no audio
    if (!audioPath) {
      await updateJob(jobId, { 
        status: 'completed', 
        phase: 'saving', 
        progress: 100,
        completedAt: new Date(),
        errorMessage: 'Skipped: Video has no audio'
      });
      
      if (job.pipelineJobId) {
        await pipelineOrchestrator.handleStageCompletion(job.pipelineJobId, 'alignment', {
          skipped: true
        });
      }
      return;
    }

    await updateJob(jobId, { phase: 'transcription', progress: 20 });

    // 4. Transcribe Audio
    const transcription = await transcribeAudio(audioPath);
    await updateJob(jobId, { phase: 'alignment', progress: 70 });

    // 5. Get Lecture Document Content
    const lectureDoc = await LectureDocument.findById(job.lectureDocumentId);
    if (!lectureDoc || !lectureDoc.extractedText || !lectureDoc.extractedText.structuredContent) {
      throw new Error(`Lecture document ${job.lectureDocumentId} has no extracted content.`);
    }

    // 6. Align Text
    const alignments = alignTextWithTranscript(
      lectureDoc.extractedText.structuredContent, 
      transcription.words,
      alignmentConfig.lowConfidenceThreshold
    );

    // T066: Add language mismatch detection between document and video in alignment stage
    // Heuristic: If more than 90% of blocks fail to align and there are many words in transcript
    const alignedCount = alignments.filter(a => a.status === 'aligned').length;
    const speakableBlocks = lectureDoc.extractedText.structuredContent.filter(b => b.content && b.content.trim().length > 0);
    const totalSpeakableBlocks = speakableBlocks.length;
    const speakableAlignedRatio = totalSpeakableBlocks > 0 ? alignedCount / totalSpeakableBlocks : 1;
    
    if (speakableAlignedRatio < 0.1 && transcription.words.length > 50) {
      console.warn(`[JobProcessor] High probability of language mismatch for job ${jobId}. Ratio: ${speakableAlignedRatio}`);
      job.errorMessage = (job.errorMessage ? job.errorMessage + '. ' : '') + 'Warning: Potential language mismatch detected between video and document.';
    }

    // 6.5. Preserve manually verified timestamps from existing transcript
    const existingTranscript = await VideoTranscript.findOne({ lessonId: job.lessonId });
    const mergedAlignments = alignments.map((newAlignment, idx) => {
      const existing = existingTranscript?.alignments?.find(a => a.blockIndex === idx);
      if (existing?.manuallyVerified) {
        return {
          ...newAlignment,
          startSeconds: existing.startSeconds,
          endSeconds: existing.endSeconds,
          confidence: existing.confidence,
          status: existing.status,
          manuallyVerified: true,
          verifiedBy: existing.verifiedBy,
          verifiedAt: existing.verifiedAt
        };
      }
      return newAlignment;
    });

    await updateJob(jobId, { phase: 'saving', progress: 90 });

    // 7. Save results to VideoTranscript
    const videoTranscript = await VideoTranscript.findOneAndUpdate(
      { lessonId: job.lessonId },
      {
        courseId: job.courseId,
        language: 'en', // TODO: Detect language or get from lesson
        duration: lesson.duration || 0, // Fallback if duration not set
        segments: transcription.segments,
        words: transcription.words,
        alignments: mergedAlignments,
        alignmentStatus: 'completed',
        processingDurationMs: Date.now() - job.startedAt.getTime()
      },
      { upsert: true, new: true }
    );

    // 8. Update LectureDocument reference
    await LectureDocument.findByIdAndUpdate(job.lectureDocumentId, {
      videoTranscriptId: videoTranscript._id
    });

    // 9. Mark Job as Completed
    await updateJob(jobId, { 
      status: 'completed', 
      progress: 100, 
      completedAt: new Date(),
      videoTranscriptId: videoTranscript._id
    });

    console.log(`[JobProcessor] Job ${jobId} completed successfully.`);

    // 10. Notify Pipeline Orchestrator if part of a pipeline
    if (job.pipelineJobId) {
      // Calculate average confidence for the stages update
      const validAlignments = mergedAlignments.filter(a => a.status === 'aligned');
      const avgConfidence = validAlignments.length > 0
        ? validAlignments.reduce((acc, a) => acc + (a.confidence || 0), 0) / validAlignments.length
        : 0;

      await pipelineOrchestrator.handleStageCompletion(job.pipelineJobId, 'alignment', {
        confidence: avgConfidence
      });
    }

  } catch (error) {
    console.error(`[JobProcessor] Job ${jobId} failed:`, error);
    
    const isRetryable = job.retryCount < alignmentConfig.maxRetries;
    const nextStatus = isRetryable ? 'queued' : 'failed';
    const scheduledFor = isRetryable 
      ? new Date(Date.now() + alignmentConfig.retryDelayMs) 
      : null;

    await updateJob(jobId, { 
      status: nextStatus, 
      errorMessage: error.message,
      failedAt: new Date(),
      retryCount: isRetryable ? job.retryCount + 1 : job.retryCount,
      scheduledFor: scheduledFor || job.scheduledFor
    });

    // If it's a permanent failure, update VideoTranscript status too
    if (nextStatus === 'failed') {
      await VideoTranscript.findOneAndUpdate(
        { lessonId: job.lessonId },
        { alignmentStatus: 'failed', errorMessage: error.message },
        { upsert: true }
      );
    }
  } finally {
    // 10. Cleanup
    if (audioPath) {
      await cleanupAudio(audioPath);
    }
  }
}

async function updateJob(jobId, updates) {
  return AlignmentJob.findByIdAndUpdate(jobId, updates, { new: true });
}
