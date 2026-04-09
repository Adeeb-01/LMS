"use server"

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { LectureDocument } from "@/model/lecture-document.model";
import { IndexingJob } from "@/model/indexing-job.model";
import { triggerIndexing as triggerIndexingJob } from "@/service/embedding-queue";
import { getTranslations } from "next-intl/server";
import { assertInstructorOwnsCourse } from "@/lib/authorization";
import { triggerIndexingSchema } from "@/lib/validations";

/**
 * Trigger re-indexing of a lecture document (instructor only).
 * @param {string} lectureDocumentId - The ID of the document to index
 * @returns {Promise<{success: boolean, jobId?: string, status?: string, error?: string}>}
 */
export async function triggerIndexing(lectureDocumentId) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    // Validate input
    const validated = triggerIndexingSchema.safeParse({ lectureDocumentId });
    if (!validated.success) {
      throw new Error(validated.error.errors[0].message);
    }

    const doc = await LectureDocument.findById(lectureDocumentId);
    if (!doc) {
      throw new Error(t('notFound'));
    }

    // Authorization check
    await assertInstructorOwnsCourse(doc.courseId, user.id, user);

    const result = await triggerIndexingJob(lectureDocumentId);
    return {
      success: true,
      jobId: result.jobId.toString(),
      status: 'pending'
    };

  } catch (error) {
    console.error("[Indexing Action] Trigger Indexing Error:", error);
    return {
      success: false,
      error: error.message || t('somethingWentWrong')
    };
  }
}

/**
 * Cancel an in-progress indexing job.
 * @param {string} jobId - The ID of the job to cancel
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function cancelIndexing(jobId) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    const job = await IndexingJob.findById(jobId);
    if (!job) {
      throw new Error(t('notFound'));
    }

    // Authorization check
    await assertInstructorOwnsCourse(job.courseId, user.id, user);

    // Update job status to cancelled
    await IndexingJob.findByIdAndUpdate(jobId, { status: 'cancelled' });

    return {
      success: true
    };

  } catch (error) {
    console.error("[Indexing Action] Cancel Indexing Error:", error);
    return {
      success: false,
      error: error.message || t('somethingWentWrong')
    };
  }
}
