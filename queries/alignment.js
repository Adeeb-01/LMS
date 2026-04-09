import { dbConnect } from "@/service/mongo";
import { VideoTranscript } from "@/model/video-transcript.model";
import { AlignmentJob } from "@/model/alignment-job.model";

/**
 * Gets alignment statuses for a list of lesson IDs.
 */
export async function getAlignmentStatusesForLessons(lessonIds) {
  await dbConnect();
  
  try {
    const transcripts = await VideoTranscript.find({
      lessonId: { $in: lessonIds }
    }).select('lessonId alignmentStatus').lean();

    const jobs = await AlignmentJob.find({
      lessonId: { $in: lessonIds },
      status: { $in: ['queued', 'processing'] }
    }).select('lessonId status phase progress').lean();

    return lessonIds.map(lessonId => {
      const transcript = transcripts.find(t => t.lessonId.toString() === lessonId.toString());
      const job = jobs.find(j => j.lessonId.toString() === lessonId.toString());

      return {
        lessonId: lessonId.toString(),
        alignmentStatus: transcript?.alignmentStatus || 'pending',
        jobStatus: job?.status || null,
        progress: job?.progress || 0
      };
    });
  } catch (error) {
    console.error("Error fetching alignment statuses:", error);
    return [];
  }
}
