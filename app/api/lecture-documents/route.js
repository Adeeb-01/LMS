import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { LectureDocument } from "@/model/lecture-document.model";
import { Lesson } from "@/model/lesson.model";
import { lectureDocumentUploadSchema, docxFileSchema } from "@/lib/validations";
import { extractTextFromDocx } from "@/lib/docx/extractor";
import { NextResponse } from "next/server";
import { assertInstructorOwnsCourse } from "@/lib/authorization";

export async function POST(request) {
  await dbConnect();

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const lessonId = formData.get("lessonId");
    const courseId = formData.get("courseId");

    // 1. Validate inputs
    const validatedFields = lectureDocumentUploadSchema.safeParse({ lessonId, courseId });
    if (!validatedFields.success) {
      return NextResponse.json({ success: false, error: validatedFields.error.errors[0].message }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Please upload a .docx file" }, { status: 400 });
    }

    const validatedFile = docxFileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (!validatedFile.success) {
      return NextResponse.json({ success: false, error: validatedFile.error.errors[0].message }, { status: 400 });
    }

    // 2. Authorization check
    try {
      await assertInstructorOwnsCourse(courseId, user.id, user);
    } catch (authError) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // 3. Check for existing document
    const existingDoc = await LectureDocument.findOne({ lessonId });
    if (existingDoc) {
      return NextResponse.json({ success: false, error: "DOCUMENT_EXISTS" }, { status: 409 });
    }

    // 4. Create initial record
    const lectureDoc = await LectureDocument.create({
      lessonId,
      courseId,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'processing',
      uploadedBy: user.id
    });

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
      return NextResponse.json({ success: false, error: "EXTRACTION_FAILED", message: extractError.message }, { status: 500 });
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

    // 7. Update Lesson model with reference
    await Lesson.findByIdAndUpdate(lessonId, {
      lectureDocumentId: updatedDoc._id
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc._id.toString(),
        lessonId: updatedDoc.lessonId.toString(),
        courseId: updatedDoc.courseId.toString(),
        originalFilename: updatedDoc.originalFilename,
        fileSize: updatedDoc.fileSize,
        status: updatedDoc.status,
        createdAt: updatedDoc.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error("API Upload Lecture Document Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
