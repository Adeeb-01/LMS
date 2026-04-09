import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { LectureDocument } from "@/model/lecture-document.model";
import { Lesson } from "@/model/lesson.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin, assertInstructorOwnsCourse } from "@/lib/authorization";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import { docxFileSchema } from "@/lib/validations";
import { extractTextFromDocx } from "@/lib/docx/extractor";

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const doc = await LectureDocument.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    // Authorization check
    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(doc.courseId, user.id);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !isEnrolled && !adminAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: doc._id.toString(),
        lessonId: doc.lessonId.toString(),
        courseId: doc.courseId.toString(),
        originalFilename: doc.originalFilename,
        fileSize: doc.fileSize,
        status: doc.status,
        extractedText: doc.extractedText,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }
    });

  } catch (error) {
    console.error("API Get Lecture Document Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

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

    // 1. Fetch document and verify authorization
    const doc = await LectureDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    try {
      await assertInstructorOwnsCourse(doc.courseId, user.id, user);
    } catch (authError) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // 2. Set to processing
    await LectureDocument.findByIdAndUpdate(id, {
      status: 'processing',
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      errorMessage: null
    });

    // 3. Extract text
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractionResult;
    try {
      extractionResult = await extractTextFromDocx(buffer);
    } catch (extractError) {
      await LectureDocument.findByIdAndUpdate(id, {
        status: 'failed',
        errorMessage: extractError.message
      });
      return NextResponse.json({ success: false, error: "EXTRACTION_FAILED", message: extractError.message }, { status: 500 });
    }

    // 4. Update document with extracted content
    const updatedDoc = await LectureDocument.findByIdAndUpdate(id, {
      status: 'ready',
      extractedText: {
        fullText: extractionResult.fullText,
        wordCount: extractionResult.wordCount,
        structuredContent: extractionResult.structuredContent,
        extractedAt: extractionResult.extractedAt,
        extractionDurationMs: extractionResult.extractionDurationMs
      }
    }, { new: true }).lean();

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc._id.toString(),
        originalFilename: updatedDoc.originalFilename,
        status: updatedDoc.status,
        updatedAt: updatedDoc.updatedAt
      },
      message: "Document replaced successfully"
    });

  } catch (error) {
    console.error("API Replace Lecture Document Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  await dbConnect();
  const { id } = await params;

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch document and verify authorization
    const doc = await LectureDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    try {
      await assertInstructorOwnsCourse(doc.courseId, user.id, user);
    } catch (authError) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const lessonId = doc.lessonId;

    // 2. Delete document
    await LectureDocument.findByIdAndDelete(id);

    // 3. Remove reference from Lesson
    await Lesson.findByIdAndUpdate(lessonId, {
      $unset: { lectureDocumentId: "" }
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });

  } catch (error) {
    console.error("API Delete Lecture Document Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

