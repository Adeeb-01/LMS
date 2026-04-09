"use server"

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { Lesson } from "@/model/lesson.model";
import { PipelineJob } from "@/model/pipeline-job.model";
import { pipelineOrchestrator } from "@/service/pipeline-orchestrator";
import { triggerPipelineSchema, retryPipelineStageSchema } from "@/lib/validations";
import { getTranslations } from "next-intl/server";
import { replaceMongoIdInObject } from "@/lib/convertData";

/**
 * Triggers a new pipeline execution for a lesson.
 * @param {string} lessonId 
 */
export async function triggerPipeline(lessonId) {
  await dbConnect();
  const t = await getTranslations("Pipeline");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: t("error_unauthorized") || "Unauthorized" };
    }

    // 1. Validate inputs (T008)
    const validated = triggerPipelineSchema.safeParse({ lessonId });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    // 2. Fetch lesson and check authorization (T039)
    const lesson = await Lesson.findById(lessonId).lean();
    if (!lesson) {
      return { success: false, error: t("error_lesson_not_found") || "Lesson not found" };
    }

    const { assertInstructorOwnsCourse } = await import("@/lib/authorization");
    
    // Fallback for courseId if not on lesson (for legacy data or if not populated)
    let courseId = lesson.courseId;
    if (!courseId) {
      const { Module } = await import("@/model/module.model");
      const module = await Module.findOne({ lessonIds: lessonId }).select('course').lean();
      if (module) {
        courseId = module.course;
      }
    }

    if (!courseId) {
      return { success: false, error: t("error_course_not_found") || "Course ID not found for this lesson" };
    }

    await assertInstructorOwnsCourse(courseId, user.id, user);

    // 3. Start pipeline (T031-T034)
    const pipeline = await pipelineOrchestrator.startPipeline(lessonId, user.id);

    return { 
      success: true, 
      pipelineId: pipeline._id.toString() 
    };

  } catch (error) {
    console.error("Trigger Pipeline Error:", error);
    return { 
      success: false, 
      error: error.message || t("error_generic") || "Something went wrong" 
    };
  }
}

/**
 * Retries a failed stage in the pipeline.
 * @param {string} pipelineId 
 * @param {string} stage 
 */
export async function retryPipelineStage(pipelineJobId, stage) {
  await dbConnect();
  const t = await getTranslations("Pipeline");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: t("error_unauthorized") || "Unauthorized" };
    }

    // 1. Validate inputs (T009)
    const validated = retryPipelineStageSchema.safeParse({ pipelineJobId, stage });
    if (!validated.success) {
      return { success: false, error: validated.error.errors[0].message };
    }

    // 2. Fetch pipeline and check authorization (T039)
    const pipeline = await PipelineJob.findById(pipelineJobId).lean();
    if (!pipeline) {
      return { success: false, error: t("error_pipeline_not_found") || "Pipeline job not found" };
    }

    const { assertInstructorOwnsCourse } = await import("@/lib/authorization");
    await assertInstructorOwnsCourse(pipeline.courseId, user.id, user);

    // 3. Retry the stage
    await pipelineOrchestrator.transitionToStage(pipelineJobId, stage);

    return { success: true };

  } catch (error) {
    console.error("Retry Pipeline Stage Error:", error);
    return { 
      success: false, 
      error: error.message || t("error_generic") || "Something went wrong" 
    };
  }
}

/**
 * Fetches the current status of a pipeline for a lesson.
 * @param {string} lessonId 
 */
export async function getPipelineStatus(lessonId) {
  await dbConnect();
  const t = await getTranslations("Pipeline");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return { success: false, error: t("error_unauthorized") || "Unauthorized" };
    }

    // Fetch the latest pipeline for this lesson
    const pipeline = await PipelineJob.findOne({ lessonId })
      .sort({ createdAt: -1 })
      .lean();

    if (!pipeline) {
      return { success: false, error: t("error_pipeline_not_found") || "Pipeline job not found" };
    }

    // Authorization check
    const { verifyInstructorOwnsCourse } = await import("@/lib/authorization");
    const isOwner = await verifyInstructorOwnsCourse(pipeline.courseId, user.id, user);
    if (!isOwner) {
      return { success: false, error: t("error_unauthorized") || "Unauthorized" };
    }

    return { 
      success: true, 
      pipeline: replaceMongoIdInObject(pipeline) 
    };

  } catch (error) {
    console.error("Get Pipeline Status Error:", error);
    return { 
      success: false, 
      error: error.message || t("error_generic") || "Something went wrong"
    };
  }
}
