"use server";

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { assertInstructorOwnsCourse } from "@/lib/authorization";
import { LectureDocument } from "@/model/lecture-document.model";
import { VideoTranscript } from "@/model/video-transcript.model";
import { AlignmentJob } from "@/model/alignment-job.model";
import { queueAlignmentJob } from "@/service/alignment-queue";
import { triggerAlignmentSchema, adjustTimestampSchema } from "@/lib/validations";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * Manually adjusts the timestamp for a text block (instructor only).
 */
export async function adjustTimestamp(lessonId, courseId, data) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Validation
    const validatedData = adjustTimestampSchema.parse(data);

    // 2. Authorization
    await assertInstructorOwnsCourse(courseId, user.id, user);

    // 3. Update VideoTranscript
    const transcript = await VideoTranscript.findOneAndUpdate(
      { 
        lessonId,
        "alignments.blockIndex": validatedData.blockIndex 
      },
      {
        $set: {
          "alignments.$.startSeconds": validatedData.startSeconds,
          "alignments.$.endSeconds": validatedData.endSeconds,
          "alignments.$.manuallyVerified": true,
          "alignments.$.status": "aligned",
          "alignments.$.verifiedBy": user.id,
          "alignments.$.verifiedAt": new Date(),
        }
      },
      { new: true }
    );

    if (!transcript) {
      return { success: false, error: "Block index out of range or no alignment data exists" };
    }

    return {
      success: true,
      message: "Timestamp updated and marked as verified"
    };

  } catch (error) {
    console.error("[Action] adjustTimestamp error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Manually triggers a retry for a failed alignment job.
 */
export async function retryAlignment(lessonId, courseId) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Authorization
    await assertInstructorOwnsCourse(courseId, user.id, user);

    // 2. Find failed job
    const failedJob = await AlignmentJob.findOne({ 
      lessonId, 
      status: 'failed' 
    }).sort({ createdAt: -1 });

    if (!failedJob) {
      return { success: false, error: "No failed alignment to retry" };
    }

    // 3. Check retry limit (max 1 retry)
    if (failedJob.retryCount >= 1) {
      return { success: false, error: "Retry limit exceeded" };
    }

    // 4. Queue retry job
    const result = await queueAlignmentJob({
      lessonId,
      courseId,
      lectureDocumentId: failedJob.lectureDocumentId,
      triggeredBy: user.id
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    return { 
      success: true, 
      jobId: result.jobId.toString(), 
      message: "Retry queued" 
    };

  } catch (error) {
    console.error("[Action] retryAlignment error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Triggers the alignment process for a lesson.
 * @param {string} lessonId
 * @param {string} courseId
 */
export async function triggerAlignment(lessonId, courseId) {
  await dbConnect();
  
  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Validation
    const validated = triggerAlignmentSchema.parse({ lessonId, courseId });

    // 2. Authorization
    await assertInstructorOwnsCourse(validated.courseId, user.id, user);

    // 3. Find existing document
    const doc = await LectureDocument.findOne({ lessonId: validated.lessonId });
    if (!doc || doc.status !== 'ready') {
      throw new Error("Lecture document is not ready for alignment.");
    }

    // 4. Queue Job
    const result = await queueAlignmentJob({
      lessonId: validated.lessonId,
      courseId: validated.courseId,
      lectureDocumentId: doc._id,
      triggeredBy: user.id
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    // 5. Update VideoTranscript status to pending/processing
    await VideoTranscript.findOneAndUpdate(
      { lessonId: validated.lessonId },
      { 
        courseId: validated.courseId, 
        alignmentStatus: 'processing',
        errorMessage: null 
      },
      { upsert: true }
    );

    return { 
      success: true, 
      message: "Alignment queued successfully", 
      jobId: result.jobId.toString() 
    };

  } catch (error) {
    console.error("[Action] triggerAlignment error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets the current alignment status for a lesson.
 */
export async function getAlignmentStatus(lessonId, courseId) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Authorization check: Instructor owns course OR student enrolled OR admin
    const { verifyInstructorOwnsCourse, isAdmin } = await import("@/lib/authorization");
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");

    const isOwner = await verifyInstructorOwnsCourse(courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
    const adminAccess = isAdmin(user);

    if (!isOwner && !isEnrolled && !adminAccess) {
      throw new Error("Forbidden");
    }

    // 2. Fetch transcript and latest job
    const transcript = await VideoTranscript.findOne({ lessonId }).lean();
    const job = await AlignmentJob.findOne({ lessonId }).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      hasAlignment: transcript?.alignmentStatus === 'completed',
      alignmentStatus: transcript?.alignmentStatus || 'none',
      jobStatus: job?.status || 'none',
      phase: job?.phase || null,
      progress: job?.progress || 0,
      errorMessage: job?.errorMessage || transcript?.errorMessage || null,
      jobId: job?._id?.toString()
    };
  } catch (error) {
    console.error("[Action] getAlignmentStatus error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Gets alignments for a lesson (students and instructors).
 */
export async function getAlignments(lessonId, courseId) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Authorization check: Instructor owns course OR student enrolled OR admin
    const { verifyInstructorOwnsCourse, isAdmin } = await import("@/lib/authorization");
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");

    const isOwner = await verifyInstructorOwnsCourse(courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
    const adminAccess = isAdmin(user);

    if (!isOwner && !isEnrolled && !adminAccess) {
      throw new Error("Forbidden");
    }

    // 2. Fetch transcript with alignments
    const transcript = await VideoTranscript.findOne({ lessonId })
      .select('alignments alignmentStatus')
      .lean();

    if (!transcript) {
      return { success: false, error: "Not Found" };
    }

    return {
      success: true,
      data: replaceMongoIdInObject(transcript)
    };
  } catch (error) {
    console.error("[Action] getAlignments error:", error);
    return { success: false, error: error.message };
  }
}
