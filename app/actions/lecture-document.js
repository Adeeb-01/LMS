"use server"

import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { LectureDocument } from "@/model/lecture-document.model";
import { Lesson } from "@/model/lesson.model";
import { VideoTranscript } from "@/model/video-transcript.model";
import { AlignmentJob } from "@/model/alignment-job.model";
import { GenerationJob } from "@/model/generation-job.model";
import { lectureDocumentUploadSchema, docxFileSchema } from "@/lib/validations";
import { extractTextFromDocx } from "@/lib/docx/extractor";
import { replaceMongoIdInObject } from "@/lib/convertData";
import { getTranslations } from "next-intl/server";
import { indexLectureDocument, unindexLectureDocument } from "@/service/lecture-document-search";
import { triggerAlignment } from "./alignment";
import { triggerIndexing as triggerIndexingJob } from "@/service/embedding-queue";
import { IndexingJob } from "@/model/indexing-job.model";
import { removeEmbeddingsByDocument } from "@/service/chroma";

export async function uploadLectureDocument(formData) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    const file = formData.get("file");
    const lessonId = formData.get("lessonId");
    const courseId = formData.get("courseId");

    // 1. Validate inputs
    const validatedFields = lectureDocumentUploadSchema.safeParse({ lessonId, courseId });
    if (!validatedFields.success) {
      throw new Error(validatedFields.error.errors[0].message);
    }

    if (!file || !(file instanceof File)) {
      throw new Error(t('invalidFile'));
    }

    const validatedFile = docxFileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (!validatedFile.success) {
      throw new Error(validatedFile.error.errors[0].message);
    }

    // 2. Authorization check: Must be instructor of the course
    const { assertInstructorOwnsCourse } = await import("@/lib/authorization");
    await assertInstructorOwnsCourse(courseId, user.id, user);

    // 3. Check for existing document
    const existingDoc = await LectureDocument.findOne({ lessonId });
    if (existingDoc) {
      throw new Error(t('documentExists') || 'A document already exists for this lesson');
    }

    // 4. Create initial record with 'processing' status
    const lectureDoc = await LectureDocument.create({
      lessonId,
      courseId,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'processing',
      uploadedBy: user.id
    });

    // 4.5. Trigger Pipeline at extraction stage
    let pipelineId = null;
    try {
      const { pipelineOrchestrator } = await import("@/service/pipeline-orchestrator");
      const pipeline = await pipelineOrchestrator.startPipeline(lessonId, user.id, 'extracting');
      pipelineId = pipeline._id;
    } catch (pipelineError) {
      console.warn("[Pipeline] Failed to pre-trigger pipeline:", pipelineError.message);
    }

    // 5. Extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractionResult;
    try {
      extractionResult = await extractTextFromDocx(buffer);
    } catch (extractError) {
      await LectureDocument.findByIdAndUpdate(lectureDoc._id, {
        status: 'failed',
        errorMessage: extractError.message
      });
      
      if (pipelineId) {
        const { pipelineOrchestrator } = await import("@/service/pipeline-orchestrator");
        await pipelineOrchestrator.handleStageFailure(pipelineId, 'extracting', extractError.message);
      }
      
      throw new Error(`${t('extractionFailed')}: ${extractError.message}`);
    }

    // 6. Update document with extracted content
    const updatedDoc = await LectureDocument.findByIdAndUpdate(lectureDoc._id, {
      status: 'ready',
      extractedText: {
        fullText: extractionResult.fullText,
        wordCount: extractionResult.wordCount,
        structuredContent: extractionResult.structuredContent,
        extractedAt: extractionResult.extractedAt,
        extractionDurationMs: extractionResult.extractionDurationMs
      }
    }, { new: true }).lean();

    // 6.5. Mark extraction as completed in pipeline
    if (pipelineId) {
      const { pipelineOrchestrator } = await import("@/service/pipeline-orchestrator");
      await pipelineOrchestrator.handleStageCompletion(pipelineId, 'extraction');
    } else {
      // Fallback if pipeline wasn't started earlier
      try {
        const { triggerPipeline } = await import("./pipeline");
        await triggerPipeline(lessonId);
      } catch (err) {}
    }

    // 7. Update Lesson model with reference
    await Lesson.findByIdAndUpdate(lessonId, {
      lectureDocumentId: updatedDoc._id
    });

    // 8. Index for search
    try {
      await indexLectureDocument(updatedDoc);
    } catch (searchError) {
      console.error("[Search] Failed to index document:", searchError);
    }

    return {
      success: true,
      data: replaceMongoIdInObject(updatedDoc)
    };

  } catch (error) {
    console.error("Upload Lecture Document Error:", error);
    return {
      success: false,
      error: error.message || t('somethingWentWrong')
    };
  }
}

export async function getLectureDocumentByLesson(lessonId) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");
  
  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    const doc = await LectureDocument.findOne({ lessonId }).lean();
    if (!doc) {
      return { success: false, error: t('notFound') };
    }

    // Authorization check: Must be instructor of course OR enrolled student OR admin
    const { verifyInstructorOwnsCourse, isAdmin } = await import("@/lib/authorization");
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");
    
    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(doc.courseId, user.id);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !isEnrolled && !adminAccess) {
      throw new Error(t('forbidden'));
    }

    return {
      success: true,
      data: replaceMongoIdInObject(doc)
    };

  } catch (error) {
    console.error("Get Lecture Document Error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getLectureDocumentStatus(documentId) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");
  
  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    const doc = await LectureDocument.findById(documentId)
      .select('status errorMessage courseId')
      .lean();
      
    if (!doc) {
      throw new Error(t('notFound'));
    }

    // Authorization check
    const { verifyInstructorOwnsCourse, isAdmin } = await import("@/lib/authorization");
    const { hasEnrollmentForCourse } = await import("@/queries/enrollments");
    
    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(doc.courseId, user.id);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !isEnrolled && !adminAccess) {
      throw new Error(t('forbidden'));
    }

    return {
      status: doc.status,
      errorMessage: doc.errorMessage
    };

  } catch (error) {
    console.error("Get Lecture Document Status Error:", error);
    throw new Error(error.message);
  }
}

export async function replaceLectureDocument(documentId, formData) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      throw new Error(t('invalidFile'));
    }

    const validatedFile = docxFileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (!validatedFile.success) {
      throw new Error(validatedFile.error.errors[0].message);
    }

    // 1. Fetch document and verify authorization
    const doc = await LectureDocument.findById(documentId);
    if (!doc) {
      throw new Error(t('notFound'));
    }

    const { assertInstructorOwnsCourse } = await import("@/lib/authorization");
    await assertInstructorOwnsCourse(doc.courseId, user.id, user);

    // 2. Set to processing
    await LectureDocument.findByIdAndUpdate(documentId, {
      status: 'processing',
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      errorMessage: null
    });

    // 2.5 Cancel any in-progress MCQ generation jobs
    await GenerationJob.updateMany(
      { lessonId: doc.lessonId, status: { $in: ['pending', 'processing'] } },
      { status: 'cancelled' }
    );

    // 3. Extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractionResult;
    try {
      extractionResult = await extractTextFromDocx(buffer);
    } catch (extractError) {
      await LectureDocument.findByIdAndUpdate(documentId, {
        status: 'failed',
        errorMessage: extractError.message
      });
      throw new Error(`${t('extractionFailed')}: ${extractError.message}`);
    }

    // 4. Update document with extracted content
    const updatedDoc = await LectureDocument.findByIdAndUpdate(documentId, {
      status: 'ready',
      extractedText: {
        fullText: extractionResult.fullText,
        wordCount: extractionResult.wordCount,
        structuredContent: extractionResult.structuredContent,
        extractedAt: extractionResult.extractedAt,
        extractionDurationMs: extractionResult.extractionDurationMs
      }
    }, { new: true }).lean();

    // 5. Re-index for search
    try {
      await unindexLectureDocument(documentId);
      await indexLectureDocument(updatedDoc);
    } catch (searchError) {
      console.error("[Search] Failed to re-index document:", searchError);
    }

    // 6. Trigger Pipeline (Orchestrates US1-3)
    try {
      const { triggerPipeline } = await import("./pipeline");
      await triggerPipeline(updatedDoc.lessonId);
    } catch (pipelineError) {
      console.error("[Pipeline] Failed to trigger pipeline:", pipelineError);
      // Fallback
      try {
        triggerAlignment(updatedDoc.lessonId, updatedDoc.courseId);
        triggerIndexingJob(documentId);
      } catch (err) {}
    }

    return {
      success: true,
      data: replaceMongoIdInObject(updatedDoc)
    };

  } catch (error) {
    console.error("Replace Lecture Document Error:", error);
    return {
      success: false,
      error: error.message || t('somethingWentWrong')
    };
  }
}

export async function deleteLectureDocument(documentId) {
  await dbConnect();
  const t = await getTranslations("LectureDocument");

  try {
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error(t('unauthorized'));
    }

    // 1. Fetch document and verify authorization
    const doc = await LectureDocument.findById(documentId);
    if (!doc) {
      throw new Error(t('notFound'));
    }

    const { assertInstructorOwnsCourse } = await import("@/lib/authorization");
    await assertInstructorOwnsCourse(doc.courseId, user.id, user);

    const lessonId = doc.lessonId;

    // 2. Delete document, transcript, and jobs
    await LectureDocument.findByIdAndDelete(documentId);
    await VideoTranscript.deleteMany({ lessonId });
    await AlignmentJob.deleteMany({ lessonId });
    await IndexingJob.deleteMany({ lectureDocumentId: documentId });
    await GenerationJob.deleteMany({ lessonId });

    // 3. Remove reference from Lesson
    await Lesson.findByIdAndUpdate(lessonId, {
      $unset: { lectureDocumentId: "" }
    });

    // 4. Unindex from search
    try {
      await unindexLectureDocument(documentId);
      await removeEmbeddingsByDocument(documentId);
    } catch (searchError) {
      console.error("[Search] Failed to unindex document:", searchError);
    }

    return {
      success: true,
      message: 'Document deleted successfully'
    };

  } catch (error) {
    console.error("Delete Lecture Document Error:", error);
    return {
      success: false,
      error: error.message || t('somethingWentWrong')
    };
  }
}



