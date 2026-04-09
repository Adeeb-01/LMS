import { dbConnect } from "@/service/mongo";
import { queryEmbeddings, isAvailable as isChromaAvailable } from "@/service/chroma";
import { generateEmbedding } from "@/lib/embeddings/gemini";
import { hasEnrollmentForCourse } from "@/queries/enrollments";
import { Lesson } from "@/model/lesson.model";
import { ERROR_CODES } from "@/lib/errors";

/**
 * Performs semantic search across course content.
 * Enforces enrollment verification for students.
 * 
 * @param {string} query - Natural language search query
 * @param {string} courseId - Course ID to search within
 * @param {object} user - Logged in user object
 * @param {object} options - { limit: 5, threshold: 0.7 }
 * @returns {Promise<object>} Search results and metadata
 */
export async function searchCourse(query, courseId, user, options = {}) {
  const { limit = 5, threshold = 0.7 } = options;
  const startTime = Date.now();

  await dbConnect();

  // 1. Enrollment Verification
  const isEnrolled = await hasEnrollmentForCourse(courseId, user.id);
  const { isAdmin, verifyInstructorOwnsCourse } = await import("@/lib/authorization");
  const isOwner = await verifyInstructorOwnsCourse(courseId, user.id, user);
  const isAuthorized = isEnrolled || isOwner || isAdmin(user);

  if (!isAuthorized) {
    throw new Error('You are not enrolled in this course');
  }

  // 2. Check if ChromaDB is available
  if (!isChromaAvailable()) {
    throw new Error('Search service temporarily unavailable. Please try again later.');
  }

  // 3. Generate Query Embedding
  const queryEmbedding = await generateEmbedding(query);

  // 4. Search ChromaDB (fetch more results to allow for threshold filtering)
  const chromaResults = await queryEmbeddings(queryEmbedding, courseId, limit * 2);

  // 5. Filter and Transform Results
  // ChromaDB distance is 0 to 2 for cosine similarity. 
  // Similarity = 1 - (distance / 2) roughly, but ChromaDB docs vary.
  // We'll use a standard transformation for relevance scoring.
  const filteredResults = [];
  for (const res of chromaResults) {
    // Convert distance to similarity score (0 to 1)
    // Distance 0 = Similarity 1, Distance 1 = Similarity 0.5, Distance 2 = Similarity 0
    const score = 1 - (res.score / 2);
    
    if (score < threshold) continue;

    // Enrich with lesson title
    const lesson = await Lesson.findById(res.metadata.lessonId).select('title').lean();
    
    filteredResults.push({
      chunkId: res.id,
      score: Math.round(score * 100) / 100,
      text: res.document,
      headingPath: res.metadata.headingPath,
      lessonId: res.metadata.lessonId,
      lessonTitle: lesson?.title || 'Unknown Lesson',
      courseId: res.metadata.courseId
    });

    if (filteredResults.length >= limit) break;
  }

  return {
    query,
    results: filteredResults,
    totalMatches: chromaResults.length,
    searchTimeMs: Date.now() - startTime
  };
}
