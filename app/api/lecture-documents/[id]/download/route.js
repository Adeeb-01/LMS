import { dbConnect } from "@/service/mongo";
import { getLoggedInUser } from "@/lib/loggedin-user";
import { LectureDocument } from "@/model/lecture-document.model";
import { NextResponse } from "next/server";
import { verifyInstructorOwnsCourse, isAdmin } from "@/lib/authorization";
import { hasEnrollmentForCourse } from "@/queries/enrollments";

export async function GET(request, { params }) {
  await dbConnect();
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'txt';

  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const doc = await LectureDocument.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    if (doc.status !== 'ready') {
      return NextResponse.json({ success: false, error: "NOT_READY", message: "Document is still processing" }, { status: 400 });
    }

    // Authorization check
    const isOwner = await verifyInstructorOwnsCourse(doc.courseId, user.id, user);
    const isEnrolled = await hasEnrollmentForCourse(doc.courseId, user.id);
    const adminAccess = isAdmin(user);
    
    if (!isOwner && !isEnrolled && !adminAccess) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    let content = "";
    let contentType = "";
    let filename = "";

    if (format === 'html') {
      contentType = "text/html; charset=utf-8";
      filename = `${doc.originalFilename.replace('.docx', '')}.html`;
      content = generateHtml(doc.extractedText.structuredContent, doc.originalFilename);
    } else if (format === 'txt') {
      contentType = "text/plain; charset=utf-8";
      filename = `${doc.originalFilename.replace('.docx', '')}.txt`;
      content = doc.extractedText.fullText;
    } else {
      return NextResponse.json({ success: false, error: "INVALID_FORMAT", message: "Format must be 'txt' or 'html'" }, { status: 400 });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });

  } catch (error) {
    console.error("API Download Lecture Document Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

function generateHtml(blocks, title) {
  const body = blocks.map(block => {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${block.content}</h${block.level}>`;
      case 'list':
        return `<li>${block.content}</li>`;
      case 'table':
        return `<p><i>[Table]: ${block.content}</i></p>`;
      default:
        return `<p>${block.content}</p>`;
    }
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        h1, h2, h3 { color: #333; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    ${body}
</body>
</html>`;
}
