import { NextResponse } from 'next/server';
import { dbConnect } from '@/service/mongo';
import { getLoggedInUser } from '@/lib/loggedin-user';
import { LectureDocument } from '@/model/lecture-document.model';
import { Lesson } from '@/model/lesson.model';
import { hasEnrollmentForCourse } from '@/queries/enrollments';
import mongoose from 'mongoose';

/**
 * GET /api/semantic-search/status
 * Get the embedding/indexing status for a course or lesson.
 */
export async function GET(req) {
  try {
    await dbConnect();
    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json({ 
        error: 'UNAUTHORIZED', 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const lessonId = searchParams.get('lessonId');

    if (!courseId) {
      return NextResponse.json({ 
        error: 'VALIDATION_ERROR', 
        message: 'courseId is required' 
      }, { status: 400 });
    }

    // 1. Authorization Verification
    const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
    const { isAdmin, verifyInstructorOwnsCourse } = await import("@/lib/authorization");
    const isOwner = await verifyInstructorOwnsCourse(courseId, user.id, user);
    const isAuthorized = isEnrolled || isOwner || isAdmin(user);

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'FORBIDDEN', 
        message: 'You are not authorized for this course' 
      }, { status: 403 });
    }

    if (lessonId) {
      // Lesson-level status
      const doc = await LectureDocument.findOne({ lessonId, courseId }).lean();
      
      if (!doc) {
        return NextResponse.json({ 
          lessonId,
          status: 'none',
          chunksIndexed: 0,
          lastIndexedAt: null,
          jobId: null
        });
      }

      return NextResponse.json({
        lessonId: doc.lessonId,
        lectureDocumentId: doc._id,
        status: doc.embeddingStatus || 'none',
        chunksIndexed: doc.chunksIndexed || 0,
        lastIndexedAt: doc.lastIndexedAt,
        jobId: doc.embeddingJobId
      });
    } else {
      // Course-level status summary
      const lessons = await Lesson.find({ courseId: new mongoose.Types.ObjectId(courseId) }).lean();
      const lessonIds = lessons.map(l => l._id);
      
      const docs = await LectureDocument.find({ 
        lessonId: { $in: lessonIds },
        courseId: new mongoose.Types.ObjectId(courseId)
      }).lean();

      const totalLessons = lessons.length;
      const indexedLessons = docs.filter(d => d.embeddingStatus === 'indexed').length;
      const pendingLessons = docs.filter(d => d.embeddingStatus === 'pending' || d.embeddingStatus === 'processing').length;
      const failedLessons = docs.filter(d => d.embeddingStatus === 'failed').length;
      const totalChunks = docs.reduce((acc, d) => acc + (d.chunksIndexed || 0), 0);
      
      const lastIndexedAt = docs.reduce((latest, d) => {
        if (!d.lastIndexedAt) return latest;
        const dDate = new Date(d.lastIndexedAt);
        return !latest || dDate > latest ? dDate : latest;
      }, null);

      return NextResponse.json({
        courseId,
        totalLessons,
        indexedLessons,
        pendingLessons,
        failedLessons,
        totalChunks,
        lastIndexedAt: lastIndexedAt ? lastIndexedAt.toISOString() : null
      });
    }

  } catch (err) {
    console.error("[Status API] Error:", err);
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR', 
      message: err.message 
    }, { status: 500 });
  }
}
