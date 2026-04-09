/**
 * @jest-environment node
 */

// Mock everything BEFORE any imports
jest.mock('../../lib/loggedin-user', () => ({
  getLoggedInUser: jest.fn()
}));

jest.mock('../../queries/enrollments', () => ({
  hasEnrollmentForCourse: jest.fn()
}));

jest.mock('../../service/chroma', () => ({
  queryEmbeddings: jest.fn()
}));

jest.mock('../../lib/embeddings/gemini', () => ({
  generateEmbedding: jest.fn()
}));

jest.mock('../../model/lesson.model', () => ({
  Lesson: {
    findById: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn()
  }
}));

jest.mock('../../service/mongo', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn().mockReturnValue(Promise.resolve((key) => key))
}));

jest.mock('../../lib/authorization', () => ({
  isAdmin: jest.fn().mockReturnValue(false),
  verifyInstructorOwnsCourse: jest.fn().mockResolvedValue(false)
}));

// Now import after mocks
import { POST } from '../../app/api/semantic-search/route';
import { searchCourseContent } from '../../app/actions/semantic-search';
import { getLoggedInUser } from '../../lib/loggedin-user';
import { hasEnrollmentForCourse } from '../../queries/enrollments';
import { queryEmbeddings } from '../../service/chroma';
import { generateEmbedding } from '../../lib/embeddings/gemini';
import { Lesson } from '../../model/lesson.model';

describe('Semantic Search Integration Tests', () => {
  const mockUser = { id: 'user123', role: 'student' };
  const mockCourseId = 'course123';
  const mockQuery = 'test query';

  beforeEach(() => {
    jest.clearAllMocks();
    getLoggedInUser.mockResolvedValue(mockUser);
    hasEnrollmentForCourse.mockResolvedValue(true);
  });

  describe('searchCourseContent Action', () => {
    it('should return relevant results for enrolled students', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      const mockChromaResults = [
        {
          id: 'chunk1',
          score: 0.1, // ChromaDB distance (lower is better)
          document: 'Relevant content',
          metadata: { lessonId: 'lesson1', headingPath: 'Chapter 1' }
        }
      ];

      generateEmbedding.mockResolvedValue(mockEmbedding);
      queryEmbeddings.mockResolvedValue(mockChromaResults);
      Lesson.lean.mockResolvedValue({ _id: 'lesson1', title: 'Lesson Title' });

      const response = await searchCourseContent(mockQuery, mockCourseId);

      expect(response.results).toHaveLength(1);
      expect(response.results[0].text).toBe('Relevant content');
      expect(response.results[0].lessonTitle).toBe('Lesson Title');
      expect(response.results[0].score).toBeGreaterThan(0.7); // Transformed similarity score
    });

    it('should fail if student is not enrolled', async () => {
      hasEnrollmentForCourse.mockResolvedValue(false);
      const response = await searchCourseContent(mockQuery, mockCourseId);
      expect(response.success).toBe(false);
      expect(response.error).toBe('You are not enrolled in this course');
    });

    it('should filter results by threshold', async () => {
      generateEmbedding.mockResolvedValue(Array(768).fill(0.1));
      queryEmbeddings.mockResolvedValue([
        { id: 'low', score: 0.8, document: 'Irrelevant', metadata: { lessonId: 'l1' } } // distance 0.8 -> similarity 0.6
      ]);

      const response = await searchCourseContent(mockQuery, mockCourseId, { threshold: 0.7 });
      expect(response.results).toHaveLength(0);
    });
  });

  describe('POST /api/semantic-search', () => {
    it('should return 401 if unauthorized', async () => {
      getLoggedInUser.mockResolvedValue(null);
      const request = new Request('http://localhost/api/semantic-search', {
        method: 'POST',
        body: JSON.stringify({ query: mockQuery, courseId: mockCourseId })
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
